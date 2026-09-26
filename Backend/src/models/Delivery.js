const mongoose = require('mongoose');

const LineItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    quantity: {
      type: mongoose.Schema.Types.Decimal128,
      required: true
    }
  },
  {
    _id: false,
    toJSON: {
      transform: (doc, ret) => {
        if (ret.quantity) ret.quantity = ret.quantity.toString();
        return ret;
      }
    }
  }
);

const DeliverySchema = new mongoose.Schema(
  {
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    customer: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['draft', 'waiting', 'ready', 'done', 'canceled', 'reversed'],
      default: 'draft',
      required: true
    },
    lines: {
      type: [LineItemSchema],
      default: []
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
        if (ret.lines) {
          ret.lines = ret.lines.map(line => ({
            productId: line.productId,
            quantity: line.quantity ? line.quantity.toString() : '0'
          }));
        }
        return ret;
      }
    }
  }
);

DeliverySchema.index({ warehouseId: 1, status: 1 });
DeliverySchema.index({ createdAt: -1 });

const Delivery = mongoose.model('Delivery', DeliverySchema);

module.exports = Delivery;
