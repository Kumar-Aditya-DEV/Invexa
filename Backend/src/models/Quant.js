const mongoose = require('mongoose');

const QuantSchema = new mongoose.Schema(
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
    quantity: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: () => mongoose.Types.Decimal128.fromString('0')
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        if (ret.quantity) ret.quantity = ret.quantity.toString();
        return ret;
      }
    }
  }
);

// Unique index on (productId, warehouseId, locationId)
QuantSchema.index(
  { productId: 1, warehouseId: 1, locationId: 1 },
  { unique: true }
);

// Helpful index for location-specific queries
QuantSchema.index({ productId: 1, locationId: 1 });

const Quant = mongoose.model('Quant', QuantSchema);

module.exports = Quant;
