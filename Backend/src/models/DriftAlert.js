const mongoose = require('mongoose');

const DriftAlertSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
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
    ledgerDerivedBalance: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    },
    quantsBalance: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    },
    detectedAt: {
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
        if (ret.ledgerDerivedBalance) ret.ledgerDerivedBalance = ret.ledgerDerivedBalance.toString();
        if (ret.quantsBalance) ret.quantsBalance = ret.quantsBalance.toString();
        return ret;
      }
    }
  }
);

DriftAlertSchema.index({ detectedAt: -1 });
DriftAlertSchema.index({ productId: 1, warehouseId: 1, locationId: 1 });

const DriftAlert = mongoose.model('DriftAlert', DriftAlertSchema, 'driftAlerts');

module.exports = DriftAlert;
