const mongoose = require('mongoose');
const Quant = require('../models/Quant');
const Ledger = require('../models/Ledger');
const ApiError = require('../errors/ApiError');
const { toDecimal, toDecimal128, add, subtract, isGreaterThan, isZero } = require('../utils/decimalHelper');

/**
 * Execute a stock-increasing operation atomically within a session:
 * 1. Upserts & increments Quant
 * 2. Writes Ledger entry with positive delta and balanceAfter
 */
async function executeStockIncrease({
  documentId,
  type,
  warehouseId,
  locationId,
  productId,
  amount,
  user,
  transferGroupId = null,
  reasonCode = null,
  session
}) {
  const decAmount = toDecimal(amount);
  if (decAmount.isNegative() || decAmount.isZero()) {
    throw new ApiError(400, 'INVALID_QUANTITY', 'Quantity must be greater than zero');
  }

  const dec128Amount = toDecimal128(decAmount);

  // Unconditional upsert with $inc
  const updatedQuant = await Quant.findOneAndUpdate(
    { productId, warehouseId, locationId },
    { $inc: { quantity: dec128Amount } },
    { upsert: true, new: true, session, setDefaultsOnInsert: true }
  );

  const balanceAfter = updatedQuant.quantity;

  const [ledgerEntry] = await Ledger.create(
    [
      {
        documentId,
        type,
        warehouseId,
        locationId,
        productId,
        quantityDelta: dec128Amount,
        balanceAfter,
        transferGroupId,
        reasonCode,
        user,
        timestamp: new Date()
      }
    ],
    { session }
  );

  return { quant: updatedQuant, ledger: ledgerEntry };
}

/**
 * Execute a stock-decreasing operation atomically within a session:
 * 1. Conditionally decrements Quant where quantity >= needed
 * 2. Throws 409 INSUFFICIENT_STOCK if stock is inadequate
 * 3. Writes Ledger entry with negative delta and balanceAfter
 */
async function executeStockDecrease({
  documentId,
  type,
  warehouseId,
  locationId,
  productId,
  amount,
  user,
  transferGroupId = null,
  reasonCode = null,
  session
}) {
  const decAmount = toDecimal(amount);
  if (decAmount.isNegative() || decAmount.isZero()) {
    throw new ApiError(400, 'INVALID_QUANTITY', 'Quantity must be greater than zero');
  }

  const dec128Needed = toDecimal128(decAmount);
  const dec128Negative = toDecimal128(decAmount.negated());

  // Atomic conditional update preventing negative quantities / overselling
  const updatedQuant = await Quant.findOneAndUpdate(
    {
      productId,
      warehouseId,
      locationId,
      quantity: { $gte: dec128Needed }
    },
    { $inc: { quantity: dec128Negative } },
    { new: true, session }
  );

  if (!updatedQuant) {
    throw new ApiError(
      409,
      'INSUFFICIENT_STOCK',
      `Insufficient stock for product ${productId} in location ${locationId}`
    );
  }

  const balanceAfter = updatedQuant.quantity;

  const [ledgerEntry] = await Ledger.create(
    [
      {
        documentId,
        type,
        warehouseId,
        locationId,
        productId,
        quantityDelta: dec128Negative,
        balanceAfter,
        transferGroupId,
        reasonCode,
        user,
        timestamp: new Date()
      }
    ],
    { session }
  );

  return { quant: updatedQuant, ledger: ledgerEntry };
}

/**
 * Execute an adjustment operation atomically within a session:
 * Calculates delta between countedQuantity and current quant balance.
 */
async function executeAdjustmentOp({
  documentId,
  warehouseId,
  locationId,
  productId,
  countedQuantity,
  reasonCode,
  user,
  session
}) {
  const decCounted = toDecimal(countedQuantity);
  if (decCounted.isNegative()) {
    throw new ApiError(400, 'INVALID_QUANTITY', 'Counted quantity cannot be negative');
  }

  // Find or initialize quant record
  let currentQuant = await Quant.findOne({ productId, warehouseId, locationId }).session(session);
  const currentVal = currentQuant ? toDecimal(currentQuant.quantity) : toDecimal(0);
  const delta = decCounted.minus(currentVal);

  if (delta.isZero()) {
    // Zero delta adjustment: still updates/records balance
    if (!currentQuant) {
      currentQuant = await Quant.create(
        [{ productId, warehouseId, locationId, quantity: toDecimal128(0) }],
        { session }
      ).then(docs => docs[0]);
    }
    const [ledgerEntry] = await Ledger.create(
      [
        {
          documentId,
          type: 'adjustment',
          warehouseId,
          locationId,
          productId,
          quantityDelta: toDecimal128(0),
          balanceAfter: toDecimal128(decCounted),
          transferGroupId: null,
          reasonCode,
          user,
          timestamp: new Date()
        }
      ],
      { session }
    );
    return { quant: currentQuant, ledger: ledgerEntry };
  }

  if (delta.isPositive()) {
    // Increase stock
    return executeStockIncrease({
      documentId,
      type: 'adjustment',
      warehouseId,
      locationId,
      productId,
      amount: delta,
      user,
      reasonCode,
      session
    });
  } else {
    // Decrease stock
    const decreaseAmount = delta.abs();
    return executeStockDecrease({
      documentId,
      type: 'adjustment',
      warehouseId,
      locationId,
      productId,
      amount: decreaseAmount,
      user,
      reasonCode,
      session
    });
  }
}

/**
 * Reversal execution helper:
 * Inverts the original quantity deltas and writes reversal ledger entries.
 */
async function executeReversalOp({
  documentId,
  originalLedgerEntries,
  user,
  session
}) {
  const reversedLedgers = [];
  
  for (const original of originalLedgerEntries) {
    const originalDelta = toDecimal(original.quantityDelta);
    const invertDelta = originalDelta.negated();

    let updatedQuant;
    if (invertDelta.isPositive()) {
      // Reversing a decrease -> increase stock
      updatedQuant = await Quant.findOneAndUpdate(
        { productId: original.productId, warehouseId: original.warehouseId, locationId: original.locationId },
        { $inc: { quantity: toDecimal128(invertDelta) } },
        { upsert: true, new: true, session }
      );
    } else {
      // Reversing an increase -> decrease stock (must check stock availability)
      const needed = invertDelta.abs();
      updatedQuant = await Quant.findOneAndUpdate(
        {
          productId: original.productId,
          warehouseId: original.warehouseId,
          locationId: original.locationId,
          quantity: { $gte: toDecimal128(needed) }
        },
        { $inc: { quantity: toDecimal128(invertDelta) } },
        { new: true, session }
      );

      if (!updatedQuant) {
        throw new ApiError(
          409,
          'INSUFFICIENT_STOCK',
          `Cannot reverse: insufficient stock for product ${original.productId} at location ${original.locationId}`
        );
      }
    }

    const [revLedger] = await Ledger.create(
      [
        {
          documentId,
          type: 'reversal',
          warehouseId: original.warehouseId,
          locationId: original.locationId,
          productId: original.productId,
          quantityDelta: toDecimal128(invertDelta),
          balanceAfter: updatedQuant.quantity,
          transferGroupId: original.transferGroupId, // §4.2: inherits original transferGroupId!
          reasonCode: original.reasonCode || null,
          user,
          timestamp: new Date()
        }
      ],
      { session }
    );

    reversedLedgers.push(revLedger);
  }

  return reversedLedgers;
}

/**
 * Wrapper for running operations inside a mongoose transaction
 */
async function runInTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    try {
      await session.withTransaction(async () => {
        result = await fn(session);
      });
    } catch (err) {
      if (
        err.message &&
        (err.message.includes('Transaction numbers are only allowed on a replica set member') ||
         err.message.includes('Standalone servers do not support transactions'))
      ) {
        result = await fn(session);
      } else {
        throw err;
      }
    }
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  executeStockIncrease,
  executeStockDecrease,
  executeAdjustmentOp,
  executeReversalOp,
  runInTransaction
};
