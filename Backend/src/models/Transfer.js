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

const TransferSchema = new mongoose.Schema(
  {
    sourceWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    sourceLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    destWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    destLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
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
    transferGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
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

TransferSchema.index({ sourceWarehouseId: 1, destWarehouseId: 1, status: 1 });
TransferSchema.index({ createdAt: -1 });

const Transfer = mongoose.model('Transfer', TransferSchema);

module.exports = Transfer;
