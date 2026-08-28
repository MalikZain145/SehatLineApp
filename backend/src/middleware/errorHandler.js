// Central error handler. Ensures the app always gets a consistent
// { success:false, message } shape, and logs the real error server-side.

const logger = require('../utils/logger');

// 404 for unmatched routes
function notFound(req, res, next) {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: `Route not found: ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  // Duplicate key (e.g. email already registered)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || { field: '' })[0];
    logger.warn(`Duplicate key on ${field}`);
    return res.status(409).json({ success: false, code: 'DUPLICATE', message: `${field} already exists.` });
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({ success: false, code: 'VALIDATION', message: first?.message || 'Validation failed.' });
  }

  logger.error(`${req.method} ${req.originalUrl} → ${err.message}`);
  res.status(status).json({
    success: false,
    code: err.code || 'SERVER_ERROR',
    message: status === 500 ? 'Something went wrong. Please try again.' : err.message,
  });
}

module.exports = { notFound, errorHandler };
