const express = require('express');
const router = express.Router();
const DriftAlert = require('../models/DriftAlert');
const { runReconciliation } = require('../services/reconciliation');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * POST /api/admin/reconcile
 * Manager only: Triggers on-demand reconciliation job
 */
router.post('/reconcile', requireAuth, requireRole('manager'), async (req, res, next) => {
  try {
    const report = await runReconciliation();
    res.json({
      success: true,
      message: 'Reconciliation completed',
      report
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/drift-alerts
 * Manager only: Returns all uncorrected drift alerts
 */
router.get('/drift-alerts', requireAuth, requireRole('manager'), async (req, res, next) => {
  try {
    const { limit = 50, cursor } = req.query;
    const filter = {};

    if (cursor) {
      filter._id = { $lt: cursor };
    }

    const pageSize = Math.min(parseInt(limit, 10) || 50, 100);
    const alerts = await DriftAlert.find(filter)
      .sort({ detectedAt: -1, _id: -1 })
      .limit(pageSize);

    res.json({
      data: alerts,
      count: alerts.length
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
