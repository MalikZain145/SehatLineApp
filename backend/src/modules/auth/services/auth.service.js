// Auth business logic shared by controllers.
// Keeps controllers thin: they parse the request, call these, and respond.

const ms = require('../../../utils/jwt');
const env = require('../../../config/env');
const Session = require('../models/Session');
const logger = require('../../../utils/logger');

// Compute a hard expiry Date from the JWT expiry string (e.g. "7d").
function computeExpiry(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const n = parseInt(match[1], 10);
  const unit = { s: 1e3, m: 60e3, h: 3600e3, d: 86400e3 }[match[2]];
  return new Date(Date.now() + n * unit);
}

// Create a session + signed token for a user.
async function createSession(user, { ip, userAgent, fingerprintHash }) {
  const session = await Session.create({
    user: user._id,
    ip: ip || '',
    userAgent: userAgent || '',
    fingerprintHash: fingerprintHash || '',
    lastActivityAt: new Date(),
    isActive: true,
    expiresAt: computeExpiry(env.jwtExpiresIn),
  });

  logger.db('INSERT', 'Session', `user=${user.email} ip=${ip}`);

  const token = ms.signToken({ userId: user._id.toString(), sessionId: session._id.toString() });
  return { session, token };
}

module.exports = { createSession, computeExpiry };
