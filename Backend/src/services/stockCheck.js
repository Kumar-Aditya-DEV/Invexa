const mongoose = require('mongoose');
const Quant = require('../models/Quant');
const { toDecimal } = require('../utils/decimalHelper');

/**
 * Checks if there is any non-zero stock in the specified warehouse (and optional location).
 * Used by Segment A to block deletion of warehouse/location.
 * @param {string|mongoose.Types.ObjectId} warehouseId 
 * @param {string|mongoose.Types.ObjectId|null} [locationId=null] 
 * @returns {Promise<boolean>}
 */
async function hasNonZeroStock(warehouseId, locationId = null) {
  const query = {
    warehouseId: new mongoose.Types.ObjectId(warehouseId)
  };

  if (locationId) {
    query.locationId = new mongoose.Types.ObjectId(locationId);
  }

  // Find any quant with quantity != 0 (represented as Decimal128 '0')
  const quants = await Quant.find(query).lean();
  
  for (const q of quants) {
    if (q.quantity && !toDecimal(q.quantity).isZero()) {
      return true;
    }
  }

  return false;
}

/**
 * Returns current stock for a product, optionally filtered to one warehouse.
 * Backs GET /api/products/:id/stock for Segment A.
 * @param {string|mongoose.Types.ObjectId} productId 
 * @param {string|mongoose.Types.ObjectId|null} [warehouseId=null] 
 * @returns {Promise<Array<{warehouseId: mongoose.Types.ObjectId, locationId: mongoose.Types.ObjectId, quantity: string}>>}
 */
async function getStockByProduct(productId, warehouseId = null) {
  const query = {
    productId: new mongoose.Types.ObjectId(productId)
  };

  if (warehouseId) {
    query.warehouseId = new mongoose.Types.ObjectId(warehouseId);
  }

  const quants = await Quant.find(query).lean();

  return quants.map(q => ({
    warehouseId: q.warehouseId,
    locationId: q.locationId,
    quantity: q.quantity ? q.quantity.toString() : '0'
  }));
}

module.exports = {
  hasNonZeroStock,
  getStockByProduct
};
