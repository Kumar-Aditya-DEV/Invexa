const express = require('express');
const mongoose = require('mongoose');
const Warehouse = require('../models/Warehouse');
const Location = require('../models/Location');
const { requireAuth, requireRole } = require('../middleware/auth');

let stockCheckService;
try {
  stockCheckService = require('../services/stockCheck');
} catch (e) {
  // Fallback stub if stockCheck service is missing or during standalone builds per Segment A §7
  stockCheckService = {
    // TODO: swap for real Segment B import
    hasNonZeroStock: async () => false,
    getStockByProduct: async () => [],
  };
}

const router = express.Router();

/**
 * GET /api/warehouses
 * Open to any logged-in user (read-only, unscoped).
 * Filters to active: true by default; supports ?includeInactive=true for Manager view.
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const filter = {};

    if (includeInactive !== 'true') {
      filter.active = true;
    }

    const warehouses = await Warehouse.find(filter).sort({ name: 1 });
    return res.json({
      data: warehouses,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/warehouses
 * Manager only. Creates a new warehouse.
 */
router.post('/', requireAuth, requireRole('manager'), async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Warehouse name is required.',
          details: {},
        },
      });
    }

    const warehouse = await Warehouse.create({
      name: name.trim(),
      active: true,
    });

    return res.status(201).json(warehouse);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/warehouses/:id
 * Open to any logged-in user.
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: {
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Warehouse not found.',
          details: { id },
        },
      });
    }

    const filter = { _id: id };
    if (req.query.includeInactive !== 'true') {
      filter.active = true;
    }

    const warehouse = await Warehouse.findOne(filter);
    if (!warehouse) {
      return res.status(404).json({
        error: {
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Warehouse not found.',
          details: { id },
        },
      });
    }

    return res.json(warehouse);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/warehouses/:id
 * Manager only. Updates warehouse details.
 */
const updateWarehouseHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: {
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Warehouse not found.',
          details: { id },
        },
      });
    }

    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({
        error: {
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Warehouse not found.',
          details: { id },
        },
      });
    }

    const { name, active } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Warehouse name must be a non-empty string.',
            details: {},
          },
        });
      }
      warehouse.name = name.trim();
    }

    if (active !== undefined) {
      warehouse.active = Boolean(active);
    }

    await warehouse.save();
    return res.json(warehouse);
  } catch (err) {
    next(err);
  }
};

router.patch('/:id', requireAuth, requireRole('manager'), updateWarehouseHandler);
router.put('/:id', requireAuth, requireRole('manager'), updateWarehouseHandler);

/**
 * DELETE /api/warehouses/:id
 * Manager only. Soft delete only (active: false).
 * Blocked with 409 WAREHOUSE_HAS_STOCK if non-zero stock quants exist.
 */
router.delete('/:id', requireAuth, requireRole('manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: {
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Warehouse not found.',
          details: { id },
        },
      });
    }

    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({
        error: {
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Warehouse not found.',
          details: { id },
        },
      });
    }

    // Check if non-zero stock exists in this warehouse
    const hasStock = await stockCheckService.hasNonZeroStock(id);
    if (hasStock) {
      return res.status(409).json({
        error: {
          code: 'WAREHOUSE_HAS_STOCK',
          message: 'Cannot delete warehouse with non-zero stock.',
          details: { warehouseId: id },
        },
      });
    }

    warehouse.active = false;
    await warehouse.save();

    return res.json({
      message: 'Warehouse deactivated successfully.',
      warehouse,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// Locations endpoints (Warehouse -> Location)
// ==========================================

/**
 * GET /api/warehouses/:id/locations
 * Open to any logged-in user.
 * Returns locations for the given warehouse.
 */
router.get('/:id/locations', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: {
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Warehouse not found.',
          details: { id },
        },
      });
    }

    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({
        error: {
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Warehouse not found.',
          details: { id },
        },
      });
    }

    const filter = { warehouseId: id };
    if (req.query.includeInactive !== 'true') {
      filter.active = true;
    }

    const locations = await Location.find(filter).sort({ name: 1 });
    return res.json({
      data: locations,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/warehouses/:id/locations
 * Manager only. Creates a location inside a warehouse.
 */
router.post('/:id/locations', requireAuth, requireRole('manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: {
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Warehouse not found.',
          details: { id },
        },
      });
    }

    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({
        error: {
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Warehouse not found.',
          details: { id },
        },
      });
    }

    if (!warehouse.active) {
      return res.status(409).json({
        error: {
          code: 'WAREHOUSE_INACTIVE',
          message: 'Cannot create locations in an inactive warehouse.',
          details: { warehouseId: id },
        },
      });
    }

    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Location name is required.',
          details: {},
        },
      });
    }

    const location = await Location.create({
      warehouseId: id,
      name: name.trim(),
      active: true,
    });

    return res.status(201).json(location);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/warehouses/:id/locations/:locId
 * Manager only. Updates location name or active status.
 */
const updateLocationHandler = async (req, res, next) => {
  try {
    const { id, locId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(locId)) {
      return res.status(404).json({
        error: {
          code: 'LOCATION_NOT_FOUND',
          message: 'Location not found.',
          details: { warehouseId: id, locationId: locId },
        },
      });
    }

    const location = await Location.findOne({ _id: locId, warehouseId: id });
    if (!location) {
      return res.status(404).json({
        error: {
          code: 'LOCATION_NOT_FOUND',
          message: 'Location not found in specified warehouse.',
          details: { warehouseId: id, locationId: locId },
        },
      });
    }

    const { name, active } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Location name must be a non-empty string.',
            details: {},
          },
        });
      }
      location.name = name.trim();
    }

    if (active !== undefined) {
      location.active = Boolean(active);
    }

    await location.save();
    return res.json(location);
  } catch (err) {
    next(err);
  }
};

router.patch('/:id/locations/:locId', requireAuth, requireRole('manager'), updateLocationHandler);
router.put('/:id/locations/:locId', requireAuth, requireRole('manager'), updateLocationHandler);

/**
 * DELETE /api/warehouses/:id/locations/:locId
 * Manager only. Soft-deletes location (active: false).
 * Blocked with 409 LOCATION_HAS_STOCK if non-zero stock quants exist in this location.
 */
router.delete('/:id/locations/:locId', requireAuth, requireRole('manager'), async (req, res, next) => {
  try {
    const { id, locId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(locId)) {
      return res.status(404).json({
        error: {
          code: 'LOCATION_NOT_FOUND',
          message: 'Location not found.',
          details: { warehouseId: id, locationId: locId },
        },
      });
    }

    const location = await Location.findOne({ _id: locId, warehouseId: id });
    if (!location) {
      return res.status(404).json({
        error: {
          code: 'LOCATION_NOT_FOUND',
          message: 'Location not found in specified warehouse.',
          details: { warehouseId: id, locationId: locId },
        },
      });
    }

    // Check if non-zero stock exists in this specific location
    const hasStock = await stockCheckService.hasNonZeroStock(id, locId);
    if (hasStock) {
      return res.status(409).json({
        error: {
          code: 'LOCATION_HAS_STOCK',
          message: 'Cannot delete location with non-zero stock.',
          details: { warehouseId: id, locationId: locId },
        },
      });
    }

    location.active = false;
    await location.save();

    return res.json({
      message: 'Location deactivated successfully.',
      location,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
