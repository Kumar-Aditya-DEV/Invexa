const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Fixed hierarchy depth for v1: Warehouse -> Location (Rack). Not
 * configurable. Do not extend this into a generalized tree/parent-child
 * structure — that's explicitly out of scope (PRD §5.9, §8, §10).
 */
const LocationSchema = new Schema(
  {
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

LocationSchema.index({ warehouseId: 1, name: 1 });

module.exports = mongoose.model('Location', LocationSchema);
