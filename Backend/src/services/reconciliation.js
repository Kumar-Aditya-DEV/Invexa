const mongoose = require('mongoose');
const Ledger = require('../models/Ledger');
const Quant = require('../models/Quant');
const DriftAlert = require('../models/DriftAlert');
const { toDecimal, toDecimal128 } = require('../utils/decimalHelper');
const Decimal = require('decimal.js');

/**
 * Runs reconciliation between the Ledger (source of truth) and Quants (materialized view).
 * For each (productId, warehouseId, locationId) found in ledger:
 * Sums all quantityDelta and compares with Quant.quantity.
 * If discrepancy detected, creates a DriftAlert record.
 * NEVER auto-corrects quants.
 */
async function runReconciliation() {
  const detectedAt = new Date();
  const alertsCreated = [];

  // 1. Group ledger entries by (productId, warehouseId, locationId)
  const ledgerAgg = await Ledger.aggregate([
    {
      $group: {
        _id: {
          productId: '$productId',
          warehouseId: '$warehouseId',
          locationId: '$locationId'
        },
        deltas: { $push: '$quantityDelta' }
      }
    }
  ]);

  for (const item of ledgerAgg) {
    const { productId, warehouseId, locationId } = item._id;

    // Sum deltas using Decimal for exact precision
    let sum = new Decimal(0);
    for (const d of item.deltas) {
      sum = sum.plus(toDecimal(d));
    }

    // Find current Quant
    const quant = await Quant.findOne({ productId, warehouseId, locationId }).lean();
    const quantVal = quant && quant.quantity ? toDecimal(quant.quantity) : new Decimal(0);

    // Compare ledger-derived balance with quant balance
    if (!sum.equals(quantVal)) {
      const alert = await DriftAlert.create({
        productId,
        warehouseId,
        locationId,
        ledgerDerivedBalance: toDecimal128(sum),
        quantsBalance: toDecimal128(quantVal),
        detectedAt
      });
      alertsCreated.push(alert);
    }
  }

  // Also check if there are Quants that have no Ledger entries at all (but non-zero quantity)
  const allQuants = await Quant.find({}).lean();
  for (const q of allQuants) {
    const qVal = q.quantity ? toDecimal(q.quantity) : new Decimal(0);
    if (!qVal.isZero()) {
      const hasLedger = await Ledger.exists({
        productId: q.productId,
        warehouseId: q.warehouseId,
        locationId: q.locationId
      });
      if (!hasLedger) {
        const alert = await DriftAlert.create({
          productId: q.productId,
          warehouseId: q.warehouseId,
          locationId: q.locationId,
          ledgerDerivedBalance: toDecimal128(0),
          quantsBalance: toDecimal128(qVal),
          detectedAt
        });
        alertsCreated.push(alert);
      }
    }
  }

  return {
    reconciledTuplesCount: ledgerAgg.length,
    driftAlertsCreatedCount: alertsCreated.length,
    alerts: alertsCreated,
    detectedAt
  };
}

module.exports = {
  runReconciliation
};
