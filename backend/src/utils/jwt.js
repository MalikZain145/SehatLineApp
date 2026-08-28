// JWT helpers. Tokens carry the userId and the sessionId so the auth
// middleware can validate the session (inactivity + fingerprint) on each call.

const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { signToken, verifyToken };
