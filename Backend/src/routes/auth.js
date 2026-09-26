const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const BootstrapSentinel = require('../models/BootstrapSentinel');
const { hashPassword, verifyPassword } = require('../services/passwordUtils');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for login endpoint (PRD §5.1)
// 10 attempts per 15 minutes window; relaxed in test environment
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many login attempts. Please try again after 15 minutes.',
        details: {},
      },
    });
  },
});

/**
 * Handler for atomic first-admin bootstrap setup (PRD §5.1, §10, Segment A §3.1).
 * Uses findOneAndUpdate with upsert against the _meta sentinel to ensure atomicity
 * and prevent race conditions between concurrent requests.
 */
async function handleFirstAdmin(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name, email, and password are required for initial setup.',
          details: {},
        },
      });
    }

    const trimmedEmail = email.toLowerCase().trim();
    const trimmedName = name.trim();

    if (password.length < 6) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 6 characters long.',
          details: {},
        },
      });
    }

    // Fast check: if sentinel already exists and is used, reject immediately
    const existingSentinel = await BootstrapSentinel.findById('bootstrap');
    if (existingSentinel && existingSentinel.used) {
      return res.status(409).json({
        error: {
          code: 'ALREADY_BOOTSTRAPPED',
          message: 'First admin account has already been created.',
          details: {},
        },
      });
    }

    // Atomic claim via findOneAndUpdate with upsert:
    // If multiple concurrent requests arrive, only ONE can atomically update/insert
    // { _id: 'bootstrap', used: false } -> { used: true }.
    // The losing requests will encounter E11000 duplicate key error on _id: 'bootstrap'.
    try {
      const sentinel = await BootstrapSentinel.findOneAndUpdate(
        { _id: 'bootstrap', used: false },
        { $set: { used: true, usedAt: new Date() } },
        { upsert: true, new: true }
      );

      if (!sentinel || !sentinel.used) {
        return res.status(409).json({
          error: {
            code: 'ALREADY_BOOTSTRAPPED',
            message: 'First admin account has already been created.',
            details: {},
          },
        });
      }
    } catch (upsertErr) {
      if (upsertErr.code === 11000 || (upsertErr.message && upsertErr.message.includes('E11000'))) {
        return res.status(409).json({
          error: {
            code: 'ALREADY_BOOTSTRAPPED',
            message: 'First admin account has already been created.',
            details: {},
          },
        });
      }
      throw upsertErr;
    }

    // Create the first Manager account
    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      passwordHash,
      role: 'manager',
      mustChangePassword: false,
      active: true,
    });

    return res.status(201).json({
      message: 'First admin account created successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/setup/first-admin (mounted directly or on /api/setup)
router.post('/first-admin', handleFirstAdmin);
router.post('/setup/first-admin', handleFirstAdmin);

/**
 * POST /api/auth/login
 * Validates credentials, checks active status, and issues stateless JWT.
 * Rate limited to 10 attempts per 15 minutes.
 */
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required.',
          details: {},
        },
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
          details: {},
        },
      });
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
          details: {},
        },
      });
    }

    // CRITICAL: Reject login with 403 if user is disabled (active === false)
    if (user.active === false) {
      return res.status(403).json({
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Account is disabled. Contact your administrator.',
          details: {},
        },
      });
    }

    // Issue JWT containing ONLY { userId, role } per PRD §5.1
    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Returns authenticated user profile. Allowed mid mustChangePassword per PRD §5.1.
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found.',
          details: {},
        },
      });
    }

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        assignedWarehouses: user.assignedWarehouses || [],
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Client-side token discard; no server-side blocklist per PRD §5.1.
 * Allowed mid mustChangePassword.
 */
router.post('/logout', requireAuth, async (req, res) => {
  return res.json({
    message: 'Logged out successfully.',
  });
});

/**
 * PUT /api/auth/change-password
 * Updates password and clears mustChangePassword flag.
 */
router.put('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'currentPassword and newPassword are required.',
          details: {},
        },
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'New password must be at least 6 characters long.',
          details: {},
        },
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found.',
          details: {},
        },
      });
    }

    const isMatch = await verifyPassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        error: {
          code: 'INCORRECT_PASSWORD',
          message: 'Current password is incorrect.',
          details: {},
        },
      });
    }

    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = false;
    await user.save();

    return res.json({
      message: 'Password changed successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
