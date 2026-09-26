const mongoose = require('mongoose');
const Decimal = require('decimal.js');

/**
 * Converts value (Decimal128, string, number) to Decimal.js instance
 */
function toDecimal(value) {
  if (value === null || value === undefined) {
    return new Decimal(0);
  }
  if (value instanceof mongoose.Types.Decimal128) {
    return new Decimal(value.toString());
  }
  if (value instanceof Decimal) {
    return value;
  }
  return new Decimal(value.toString());
}

/**
 * Converts value to mongoose.Types.Decimal128
 */
function toDecimal128(value) {
  if (value === null || value === undefined) {
    return mongoose.Types.Decimal128.fromString('0');
  }
  if (value instanceof mongoose.Types.Decimal128) {
    return value;
  }
  if (value instanceof Decimal) {
    return mongoose.Types.Decimal128.fromString(value.toString());
  }
  return mongoose.Types.Decimal128.fromString(String(value));
}

/**
 * Adds two Decimal128 or numeric values, returning Decimal128
 */
function add(a, b) {
  const decA = toDecimal(a);
  const decB = toDecimal(b);
  return toDecimal128(decA.plus(decB));
}

/**
 * Subtracts b from a, returning Decimal128
 */
function subtract(a, b) {
  const decA = toDecimal(a);
  const decB = toDecimal(b);
  return toDecimal128(decA.minus(decB));
}

/**
 * Compares two values:
 * returns 1 if a > b, -1 if a < b, 0 if a == b
 */
function compare(a, b) {
  const decA = toDecimal(a);
  const decB = toDecimal(b);
  return decA.comparedTo(decB);
}

function isGreaterThan(a, b) {
  return toDecimal(a).greaterThan(toDecimal(b));
}

function isGreaterThanOrEqualTo(a, b) {
  return toDecimal(a).greaterThanOrEqualTo(toDecimal(b));
}

function isLessThan(a, b) {
  return toDecimal(a).lessThan(toDecimal(b));
}

function isLessThanOrEqualTo(a, b) {
  return toDecimal(a).lessThanOrEqualTo(toDecimal(b));
}

function isEqual(a, b) {
  return toDecimal(a).equals(toDecimal(b));
}

function isZero(val) {
  return toDecimal(val).isZero();
}

function isPositive(val) {
  return toDecimal(val).isPositive() && !toDecimal(val).isZero();
}

module.exports = {
  toDecimal,
  toDecimal128,
  add,
  subtract,
  compare,
  isGreaterThan,
  isGreaterThanOrEqualTo,
  isLessThan,
  isLessThanOrEqualTo,
  isEqual,
  isZero,
  isPositive
};
