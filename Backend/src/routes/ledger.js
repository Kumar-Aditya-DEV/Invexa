const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Ledger = require('../models/Ledger');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/ledger
 * Cursor-paginated view over the stock ledger
 * Query params: product, location, warehouse, type, user, from, to, cursor, limit
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
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

    // Date range filtering (UTC)
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    // Scoping for Staff if assignedWarehouses provided
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

    // Cursor pagination (using _id descending)
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
