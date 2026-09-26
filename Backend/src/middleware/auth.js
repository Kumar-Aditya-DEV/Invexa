const ApiError = require('../errors/ApiError');

/**
 * Authentication middleware contract with Segment A.
 * Sets req.user = { userId, role, assignedWarehouses }
 */
function requireAuth(req, res, next) {
  // If already authenticated by Segment A upstream middleware
  if (req.user && req.user.userId) {
    return next();
  }

  // Fallback / Header extraction for local testing & development
  const userId = req.headers['x-user-id'] || '000000000000000000000001';
  const role = req.headers['x-user-role'] || 'manager'; // 'manager' | 'staff'
  const assignedWarehousesHeader = req.headers['x-assigned-warehouses'];
  
  let assignedWarehouses = [];
  if (assignedWarehousesHeader) {
    assignedWarehouses = typeof assignedWarehousesHeader === 'string'
      ? assignedWarehousesHeader.split(',').map(s => s.trim())
      : assignedWarehousesHeader;
  }

  req.user = {
    userId,
    role,
    assignedWarehouses
  };

  next();
}

/**
 * Role-based authorization middleware
 * @param {string|string[]} roles Allowed role(s)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    const userRole = req.user.role.toLowerCase();
    const allowedRoles = roles.map(r => r.toLowerCase());

    if (!allowedRoles.includes(userRole)) {
      return next(new ApiError(403, 'FORBIDDEN', `Role '${req.user.role}' does not have access to this resource`));
    }

    next();
  };
}

/**
 * Warehouse scoping middleware
 * @param {Function} getWarehouseIds Function receiving req and returning Array of warehouseId (or single warehouseId)
 */
function requireWarehouseAccess(getWarehouseIds) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
      }

      // Managers have access to all warehouses
      if (req.user.role && req.user.role.toLowerCase() === 'manager') {
        return next();
      }

      // If user is Staff, verify they have access to all required warehouses
      const rawIds = await Promise.resolve(getWarehouseIds(req));
      const requiredWarehouseIds = (Array.isArray(rawIds) ? rawIds : [rawIds])
        .filter(Boolean)
        .map(id => id.toString());

      if (requiredWarehouseIds.length === 0) {
        return next();
      }

      const assigned = (req.user.assignedWarehouses || []).map(id => id.toString());

      const hasAccessToAll = requiredWarehouseIds.every(whId => assigned.includes(whId));

      if (!hasAccessToAll) {
        return next(new ApiError(403, 'WAREHOUSE_NOT_ASSIGNED', 'You do not have access to the requested warehouse(s)'));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  requireAuth,
  requireRole,
  requireWarehouseAccess
};
