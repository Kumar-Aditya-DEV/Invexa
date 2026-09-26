const mongoose = require('mongoose');

const LedgerSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    type: {
      type: String,
      enum: ['receipt', 'delivery', 'transfer_out', 'transfer_in', 'adjustment', 'reversal'],
      required: true
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    quantityDelta: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    },
    balanceAfter: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    },
    transferGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    reasonCode: {
      type: String,
      enum: ['damage', 'theft', 'count_error', 'expiry', 'found', 'other', null],
      default: null
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    timestamp: {
      type: Date,
      default: () => new Date(),
      required: true
    }
  },
  {
    timestamps: false,
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        if (ret.quantityDelta) ret.quantityDelta = ret.quantityDelta.toString();
        if (ret.balanceAfter) ret.balanceAfter = ret.balanceAfter.toString();
        return ret;
      }
    }
  }
);

// CRITICAL INDEX: multi-line document uniqueness
LedgerSchema.index(
  { documentId: 1, type: 1, locationId: 1, productId: 1 },
  { unique: true }
);

// Indexes for fast cursor pagination and filtering
LedgerSchema.index({ timestamp: -1, _id: -1 });
LedgerSchema.index({ productId: 1, warehouseId: 1, locationId: 1 });
LedgerSchema.index({ transferGroupId: 1 });

const Ledger = mongoose.model('Ledger', LedgerSchema);

module.exports = Ledger;
