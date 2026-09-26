const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Quant = require('../models/Quant');
const Receipt = require('../models/Receipt');
const Delivery = require('../models/Delivery');
const Transfer = require('../models/Transfer');
const Ledger = require('../models/Ledger');
const { requireAuth } = require('../middleware/auth');
const { toDecimal } = require('../utils/decimalHelper');
const Decimal = require('decimal.js');

/**
 * GET /api/dashboard/kpis
 */
router.get('/kpis', requireAuth, async (req, res, next) => {
  try {
    const { warehouseId } = req.query;
    const quantMatch = {};
    const docMatch = {};

    if (warehouseId) {
      const whId = new mongoose.Types.ObjectId(warehouseId);
      quantMatch.warehouseId = whId;
      docMatch.warehouseId = whId;
    }

    if (req.user.role !== 'manager' && req.user.assignedWarehouses && req.user.assignedWarehouses.length > 0) {
      const allowed = req.user.assignedWarehouses.map(id => new mongoose.Types.ObjectId(id));
      quantMatch.warehouseId = { $in: allowed };
    }

    // 1. Group quants by product to calculate total product balances
    const productQuantAgg = await Quant.aggregate([
      { $match: quantMatch },
      {
        $group: {
          _id: '$productId',
          quantities: { $push: '$quantity' }
        }
      }
    ]);

    let inStockProductsCount = 0;
    let outOfStockProductsCount = 0;
    let lowStockProductsCount = 0;

    // Try reading products from Segment A collection if exists
    let productMetadataMap = new Map();
    try {
      const ProductModel = mongoose.models.Product || mongoose.model('Product');
      const products = await ProductModel.find({}).lean();
      products.forEach(p => productMetadataMap.set(p._id.toString(), p));
    } catch {
      // Product model might not be registered yet if Segment A is running separately
    }

    for (const item of productQuantAgg) {
      const prodIdStr = item._id.toString();
      const productMeta = productMetadataMap.get(prodIdStr);

      // Skip inactive products if Product model exists with active flag
      if (productMeta && productMeta.active === false) {
        continue;
      }

      let totalProductQty = new Decimal(0);
      for (const q of item.quantities) {
        totalProductQty = totalProductQty.plus(toDecimal(q));
      }

      if (totalProductQty.isPositive()) {
        inStockProductsCount++;
      } else if (totalProductQty.isZero()) {
        outOfStockProductsCount++;
      }

      // Check low stock against product reorderPoint or default threshold (10)
      const reorderPoint = productMeta && productMeta.reorderPoint !== undefined
        ? new Decimal(productMeta.reorderPoint)
        : new Decimal(10);

      if (totalProductQty.greaterThan(0) && totalProductQty.lessThanOrEqualTo(reorderPoint)) {
        lowStockProductsCount++;
      }
    }

    // Pending Receipts count
    const pendingReceiptsCount = await Receipt.countDocuments({
      status: { $in: ['draft', 'waiting', 'ready'] },
      ...(docMatch.warehouseId ? { warehouseId: docMatch.warehouseId } : {})
    });

    // Pending Deliveries count
    const pendingDeliveriesCount = await Delivery.countDocuments({
      status: { $in: ['draft', 'waiting', 'ready'] },
      ...(docMatch.warehouseId ? { warehouseId: docMatch.warehouseId } : {})
    });

    // Scheduled Transfers count
    const transferMatch = {
      status: { $in: ['draft', 'waiting', 'ready'] }
    };
    if (warehouseId) {
      const whId = new mongoose.Types.ObjectId(warehouseId);
      transferMatch.$or = [{ sourceWarehouseId: whId }, { destWarehouseId: whId }];
    }
    const scheduledTransfersCount = await Transfer.countDocuments(transferMatch);

    res.json({
      totalProductsInStock: inStockProductsCount,
      lowStockProducts: lowStockProductsCount,
      outOfStockProducts: outOfStockProductsCount,
      pendingReceipts: pendingReceiptsCount,
      pendingDeliveries: pendingDeliveriesCount,
      scheduledTransfers: scheduledTransfersCount
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/move-history or /api/dashboard/move-history
 * Alias for ledger movements view
 */
router.get(['/move-history', '/'], requireAuth, async (req, res, next) => {
  try {
    // If mounted on /api/dashboard, only handle /move-history
    if (req.baseUrl === '/api/dashboard' && req.path === '/') {
      return next();
    }
    const {
      product,
      productId,
      location,
      locationId,
      warehouse,
      warehouseId,
      type,
      user,
      userId,
      from,
      to,
      cursor,
      limit = 50
    } = req.query;

    const filter = {};

    const prod = product || productId;
    if (prod) filter.productId = new mongoose.Types.ObjectId(prod);

    const loc = location || locationId;
    if (loc) filter.locationId = new mongoose.Types.ObjectId(loc);

    const wh = warehouse || warehouseId;
    if (wh) filter.warehouseId = new mongoose.Types.ObjectId(wh);

    if (type) filter.type = type;

    const usr = user || userId;
    if (usr) filter.user = new mongoose.Types.ObjectId(usr);

    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    if (req.user.role !== 'manager' && req.user.assignedWarehouses && req.user.assignedWarehouses.length > 0) {
      const allowed = req.user.assignedWarehouses.map(id => new mongoose.Types.ObjectId(id));
      if (filter.warehouseId) {
        if (!req.user.assignedWarehouses.includes(filter.warehouseId.toString())) {
          return res.json({ data: [], nextCursor: null, hasMore: false });
        }
      } else {
        filter.warehouseId = { $in: allowed };
      }
    }

    if (cursor) {
      filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const pageSize = Math.min(parseInt(limit, 10) || 50, 100);
    const docs = await Ledger.find(filter)
      .sort({ _id: -1 })
      .limit(pageSize + 1);

    const hasMore = docs.length > pageSize;
    const results = hasMore ? docs.slice(0, pageSize) : docs;
    const nextCursor = hasMore ? results[results.length - 1]._id.toString() : null;

    res.json({
      data: results,
      nextCursor,
      hasMore
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
