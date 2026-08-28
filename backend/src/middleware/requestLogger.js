// Logs every incoming request with the real client IP.
// Answers "where is this being accessed from" in the terminal.

const requestIp = require('request-ip');
const logger = require('../utils/logger');

module.exports = function requestLogger(req, res, next) {
  const ip = requestIp.getClientIp(req) || req.ip || 'unknown';
  req.clientIp = ip;
  logger.access(ip, req.method, req.originalUrl);
  next();
};
