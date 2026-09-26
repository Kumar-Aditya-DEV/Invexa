const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Adjustment = require('../models/Adjustment');
const Ledger = require('../models/Ledger');
const ApiError = require('../errors/ApiError');
const { requireAuth, requireRole, requireWarehouseAccess } = require('../middleware/auth');
const { toDecimal, toDecimal128 } = require('../utils/decimalHelper');
const {
  executeAdjustmentOp,
  executeReversalOp,
  runInTransaction
} = require('../services/quantOps');

const VALID_REASON_CODES = ['damage', 'theft', 'count_error', 'expiry', 'found', 'other'];

// Middleware to load adjustment document onto req for scoping
async function loadAdjustment(req, res, next) {
  try {
    const adj = await Adjustment.findById(req.params.id);
    if (!adj) {
      return next(new ApiError(404, 'NOT_FOUND', 'Adjustment not found'));
    }
    req.document = adj;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/adjustments
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, warehouseId, productId, limit = 50, cursor } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (warehouseId) filter.warehouseId = new mongoose.Types.ObjectId(warehouseId);
    if (productId) filter.productId = new mongoose.Types.ObjectId(productId);

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
    const docs = await Adjustment.find(filter)
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

/**
 * POST /api/adjustments
 */
router.post(
  '/',
  requireAuth,
  requireWarehouseAccess(req => [req.body.warehouseId]),
  async (req, res, next) => {
    try {
      const { productId, warehouseId, locationId, countedQuantity, reasonCode, status } = req.body;

      if (!productId || !warehouseId || !locationId) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'productId, warehouseId, and locationId are required');
      }

      if (!reasonCode || !VALID_REASON_CODES.includes(reasonCode)) {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          `reasonCode must be one of: ${VALID_REASON_CODES.join(', ')}`
        );
      }

      const decCounted = toDecimal(countedQuantity);
      if (decCounted.isNegative()) {
        throw new ApiError(400, 'INVALID_QUANTITY', 'countedQuantity must be greater than or equal to 0');
      }

      const initialStatus = status === 'draft' ? 'draft' : 'draft';

      const adjustment = await Adjustment.create({
        productId: new mongoose.Types.ObjectId(productId),
        warehouseId: new mongoose.Types.ObjectId(warehouseId),
        locationId: new mongoose.Types.ObjectId(locationId),
        countedQuantity: toDecimal128(decCounted),
        reasonCode,
        status: initialStatus,
        createdBy: new mongoose.Types.ObjectId(req.user.userId)
      });

      res.status(201).json(adjustment);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/adjustments/:id
 */
router.get('/:id', requireAuth, loadAdjustment, async (req, res) => {
  res.json(req.document);
});

/**
 * PUT /api/adjustments/:id
 */
router.put(
  '/:id',
  requireAuth,
  loadAdjustment,
  requireWarehouseAccess(req => [req.document.warehouseId, req.body.warehouseId]),
  async (req, res, next) => {
    try {
      const doc = req.document;

      if (['done', 'reversed'].includes(doc.status)) {
        throw new ApiError(409, 'DOCUMENT_LOCKED', `Cannot modify adjustment in '${doc.status}' status`);
      }

      const { productId, warehouseId, locationId, countedQuantity, reasonCode } = req.body;

      if (productId) doc.productId = new mongoose.Types.ObjectId(productId);
      if (warehouseId) doc.warehouseId = new mongoose.Types.ObjectId(warehouseId);
      if (locationId) doc.locationId = new mongoose.Types.ObjectId(locationId);

      if (countedQuantity !== undefined) {
        const decCounted = toDecimal(countedQuantity);
        if (decCounted.isNegative()) {
          throw new ApiError(400, 'INVALID_QUANTITY', 'countedQuantity must be greater than or equal to 0');
        }
        doc.countedQuantity = toDecimal128(decCounted);
      }

      if (reasonCode) {
        if (!VALID_REASON_CODES.includes(reasonCode)) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            `reasonCode must be one of: ${VALID_REASON_CODES.join(', ')}`
          );
        }
        doc.reasonCode = reasonCode;
      }

      await doc.save();
      res.json(doc);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/adjustments/:id/validate
 * Atomic: status check + quant adjustment + ledger insert
 */
router.post(
  '/:id/validate',
  requireAuth,
  loadAdjustment,
  requireWarehouseAccess(req => [req.document.warehouseId]),
  async (req, res, next) => {
    try {
      const adjustmentId = req.document._id;

      const result = await runInTransaction(async (session) => {
        const doc = await Adjustment.findById(adjustmentId).session(session);
        if (!doc) {
          throw new ApiError(404, 'NOT_FOUND', 'Adjustment not found');
        }

        if (doc.status === 'done' || doc.status === 'reversed') {
          throw new ApiError(409, 'INVALID_STATUS_TRANSITION', `Adjustment is already ${doc.status}`);
        }

        if (doc.status === 'canceled') {
          throw new ApiError(409, 'INVALID_STATUS_TRANSITION', 'Cannot validate a canceled adjustment');
        }

        if (doc.status !== 'draft') {
          throw new ApiError(409, 'INVALID_STATUS_TRANSITION', `Invalid status '${doc.status}' for validation`);
        }

        await executeAdjustmentOp({
          documentId: doc._id,
          warehouseId: doc.warehouseId,
          locationId: doc.locationId,
          productId: doc.productId,
          countedQuantity: doc.countedQuantity,
          reasonCode: doc.reasonCode,
          user: new mongoose.Types.ObjectId(req.user.userId),
          session
        });

        doc.status = 'done';
        await doc.save({ session });

        return doc;
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/adjustments/:id/cancel
 */
router.post(
  '/:id/cancel',
  requireAuth,
  loadAdjustment,
  requireWarehouseAccess(req => [req.document.warehouseId]),
  async (req, res, next) => {
    try {
      const doc = req.document;

      if (['done', 'reversed'].includes(doc.status)) {
        throw new ApiError(409, 'INVALID_STATUS_TRANSITION', `Cannot cancel an adjustment in '${doc.status}' status`);
      }

      doc.status = 'canceled';
      await doc.save();

      res.json(doc);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/adjustments/:id/reverse
 * Manager-only
 */
router.post(
  '/:id/reverse',
  requireAuth,
  requireRole('manager'),
  loadAdjustment,
  requireWarehouseAccess(req => [req.document.warehouseId]),
  async (req, res, next) => {
    try {
      const adjustmentId = req.document._id;

      const result = await runInTransaction(async (session) => {
        const doc = await Adjustment.findById(adjustmentId).session(session);
        if (!doc) {
          throw new ApiError(404, 'NOT_FOUND', 'Adjustment not found');
        }

        if (doc.status === 'reversed') {
          throw new ApiError(409, 'ALREADY_REVERSED', 'Adjustment has already been reversed');
        }

        if (doc.status !== 'done') {
          throw new ApiError(409, 'INVALID_STATUS_TRANSITION', 'Only done adjustments can be reversed');
        }

        const originalLedgers = await Ledger.find({
          documentId: doc._id,
          type: 'adjustment'
        }).session(session);

        await executeReversalOp({
          documentId: doc._id,
          originalLedgerEntries: originalLedgers,
          user: new mongoose.Types.ObjectId(req.user.userId),
          session
        });

        doc.status = 'reversed';
        await doc.save({ session });

        return doc;
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
