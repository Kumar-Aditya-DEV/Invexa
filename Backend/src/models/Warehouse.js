const mongoose = require('mongoose');

const { Schema } = mongoose;

const WarehouseSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Soft-delete only. DELETE /api/warehouses/:id sets this to false
    // instead of removing the document — and only after confirming (via
    // Segment B's hasNonZeroStock) that no stock remains in it (PRD §5.9, §13).
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Warehouse', WarehouseSchema);
