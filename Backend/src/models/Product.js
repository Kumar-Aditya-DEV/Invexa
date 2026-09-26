const mongoose = require('mongoose');

const { Schema } = mongoose;

const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // Free text for v1 — deliberately not a separate Category collection
    // with CRUD (PRD §5.2, §8). Do not add a Category model.
    category: {
      type: String,
      trim: true,
      default: '',
    },
    unitOfMeasure: {
      type: String,
      required: true,
      trim: true,
    },
    // Nullable. If set, the dashboard's low-stock KPI (owned by Segment B)
    // uses this value; if null, it falls back to a global threshold.
    // This field IS the low-stock KPI's input per PRD §5.2, §5.10.
    reorderPoint: {
      type: Number,
      default: null,
      min: 0,
    },
    // Deliberately NO reorderQuantity field — no v1 consumer exists
    // (no automated reordering in v1 per PRD §5.2, §7, §8).
    // Soft-delete only, never hard DELETE.
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', ProductSchema);
