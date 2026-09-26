const ApiError = require('../errors/ApiError');

function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details || {}
      }
    });
  }

  // Handle Mongoose CastError / ValidationError
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.errors || {}
      }
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Invalid identifier format for field: ${err.path}`,
        details: { path: err.path, value: err.value }
      }
    });
  }

  // Fallback 500 error
  console.error('Unhandled Server Error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected internal error occurred',
      details: {}
    }
  });
}

module.exports = errorHandler;
