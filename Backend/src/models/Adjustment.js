const mongoose = require('mongoose');

const AdjustmentSchema = new mongoose.Schema(
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
    countedQuantity: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    },
    reasonCode: {
      type: String,
      enum: ['damage', 'theft', 'count_error', 'expiry', 'found', 'other'],
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'done', 'canceled', 'reversed'],
      default: 'draft',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        if (ret.countedQuantity) ret.countedQuantity = ret.countedQuantity.toString();
        return ret;
      }
    }
  }
);

AdjustmentSchema.index({ warehouseId: 1, status: 1 });
AdjustmentSchema.index({ createdAt: -1 });

const Adjustment = mongoose.model('Adjustment', AdjustmentSchema);

module.exports = Adjustment;
