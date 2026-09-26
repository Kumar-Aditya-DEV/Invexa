const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { requireAuth, requireRole } = require('../middleware/auth');

let stockCheckService;
try {
  stockCheckService = require('../services/stockCheck');
} catch (e) {
  // Fallback stub if stockCheck service is missing or during standalone builds per Segment A §7
  stockCheckService = {
    // TODO: swap for real Segment B import
    getStockByProduct: async () => [],
    hasNonZeroStock: async () => false,
  };
}

const router = express.Router();

/**
 * GET /api/products
 * Accessible to any logged-in user (Manager or Staff).
 * Filters to active: true by default; supports ?includeInactive=true for Manager view.
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { includeInactive, category, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (includeInactive !== 'true') {
      filter.active = true;
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter).sort({ name: 1 }).skip(skip).limit(limitNum),
    ]);

    return res.json({
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/products/:id
 * Accessible to any logged-in user.
 * Returns 404 if product not found or inactive (unless ?includeInactive=true).
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found.',
          details: { id },
        },
      });
    }

    const filter = { _id: id };
    if (req.query.includeInactive !== 'true') {
      filter.active = true;
    }

    const product = await Product.findOne(filter);
    if (!product) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found.',
          details: { id },
        },
      });
    }

    return res.json(product);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/products/:id/stock
 * Thin proxy calling getStockByProduct from Segment B's stockCheck service.
 */
router.get('/:id/stock', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found.',
          details: { id },
        },
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found.',
          details: { id },
        },
      });
    }

    const warehouseId = req.query.warehouse || null;
    const stock = await stockCheckService.getStockByProduct(id, warehouseId);

    return res.json({
      productId: id,
      stock,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/products
 * Manager only. Creates a new product.
 * Enforces DB-level SKU uniqueness, returning 400 DUPLICATE_SKU on collision.
 */
router.post('/', requireAuth, requireRole('manager'), async (req, res, next) => {
  try {
    const { name, sku, category = '', unitOfMeasure, reorderPoint = null } = req.body;

    if (!name || !sku || !unitOfMeasure) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name, sku, and unitOfMeasure are required.',
          details: {},
        },
      });
    }

    const parsedReorderPoint = reorderPoint !== null && reorderPoint !== undefined && reorderPoint !== ''
      ? Number(reorderPoint)
      : null;

    if (parsedReorderPoint !== null && (isNaN(parsedReorderPoint) || parsedReorderPoint < 0)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'reorderPoint must be a non-negative number or null.',
          details: { reorderPoint },
        },
      });
    }

    try {
      const product = await Product.create({
        name: name.trim(),
        sku: sku.trim(),
        category: typeof category === 'string' ? category.trim() : '',
        unitOfMeasure: unitOfMeasure.trim(),
        reorderPoint: parsedReorderPoint,
        active: true,
      });

      return res.status(201).json(product);
    } catch (err) {
      if (err.code === 11000 || (err.message && err.message.includes('E11000'))) {
        return res.status(400).json({
          error: {
            code: 'DUPLICATE_SKU',
            message: 'A product with this SKU already exists.',
            details: { sku: sku.trim() },
          },
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/products/:id
 * Manager only. Updates an existing product.
 * Handles duplicate-key errors if SKU is updated to collide with another product.
 */
router.put('/:id', requireAuth, requireRole('manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found.',
          details: { id },
        },
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found.',
          details: { id },
        },
      });
    }

    const { name, sku, category, unitOfMeasure, reorderPoint, active } = req.body;

    if (name !== undefined) product.name = name.trim();
    if (sku !== undefined) product.sku = sku.trim();
    if (category !== undefined) product.category = typeof category === 'string' ? category.trim() : '';
    if (unitOfMeasure !== undefined) product.unitOfMeasure = unitOfMeasure.trim();
    if (active !== undefined) product.active = Boolean(active);

    if (reorderPoint !== undefined) {
      const parsedReorderPoint = reorderPoint !== null && reorderPoint !== ''
        ? Number(reorderPoint)
        : null;

      if (parsedReorderPoint !== null && (isNaN(parsedReorderPoint) || parsedReorderPoint < 0)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'reorderPoint must be a non-negative number or null.',
            details: { reorderPoint },
          },
        });
      }
      product.reorderPoint = parsedReorderPoint;
    }

    try {
      await product.save();
      return res.json(product);
    } catch (err) {
      if (err.code === 11000 || (err.message && err.message.includes('E11000'))) {
        return res.status(400).json({
          error: {
            code: 'DUPLICATE_SKU',
            message: 'A product with this SKU already exists.',
            details: { sku: product.sku },
          },
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/products/:id
 * Manager only. Soft-deletes product by setting active: false.
 * Never performs a hard delete in MongoDB.
 */
router.delete('/:id', requireAuth, requireRole('manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found.',
          details: { id },
        },
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found.',
          details: { id },
        },
      });
    }

    product.active = false;
    await product.save();

    return res.json({
      message: 'Product deactivated successfully.',
      product,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
