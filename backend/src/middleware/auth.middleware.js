// Protects routes. On every protected call it:
//   1) verifies the JWT
//   2) loads the session referenced by the token
//   3) rejects if the session is inactive too long (auto-logout)
//   4) rejects if the request's device fingerprint differs from the
//      one the session was created with (someone else's finger → logout)
//   5) refreshes lastActivityAt so the inactivity clock resets on activity
//
// A rejection here (401) is the signal the app uses to force a logout.

const { verifyToken } = require('../utils/jwt');
const env = require('../config/env');
const Session = require('../modules/auth/models/Session');
const User = require('../modules/auth/models/User');
const emailService = require('../services/email.service');
const logger = require('../utils/logger');

module.exports = async function authGuard(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, code: 'NO_TOKEN', message: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (e) {
      return res.status(401).json({ success: false, code: 'BAD_TOKEN', message: 'Session expired. Please log in again.' });
    }

    const session = await Session.findById(decoded.sessionId);
    if (!session || !session.isActive) {
      return res.status(401).json({ success: false, code: 'NO_SESSION', message: 'Session ended. Please log in again.' });
    }

    // Inactivity timeout
    if (session.isInactive(env.sessionInactivityMinutes)) {
      session.isActive = false;
      await session.save();
      logger.warn(`Session ${session._id} auto-logged out (inactivity)`);
      return res.status(401).json({ success: false, code: 'INACTIVE', message: 'Logged out due to inactivity.' });
    }

    // Fingerprint / device binding: the app sends the current device
    // fingerprint hash in this header. If it differs → force logout.
    const incomingFp = req.headers['x-fingerprint'] || '';
    if (session.fingerprintHash && incomingFp && incomingFp !== session.fingerprintHash) {
      session.isActive = false;
      await session.save();
      logger.warn(`Session ${session._id} invalidated (fingerprint mismatch)`);

      // The session is bound to a different device fingerprint than the one
      // making this request — a strong signal the account is being used by
      // someone who isn't the owner. Auto-logout (above) AND alert the owner
      // by email to change their password. Fire-and-forget + best-effort user
      // lookup so this can never break the response.
      User.findById(decoded.userId).then((owner) => {
        if (owner?.email) {
          emailService.sendUnusualActivityEmail(owner.email, owner.name, {
            time: new Date().toLocaleString(),
            ip: req.clientIp || req.ip || '',
            device: req.headers['user-agent'] || '',
          }).catch(() => {});
        }
      }).catch(() => {});

      // Distinct from the login-time FINGERPRINT_MISMATCH: this one means the
      // *session* is bound to a different device fingerprint, and the client
      // must sign out. The login-time one is just a failed match attempt.
      return res.status(401).json({ success: false, code: 'FINGERPRINT_MISMATCH_SESSION', message: 'Biometric mismatch. Logged out for security.' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, code: 'NO_USER', message: 'Account not found.' });
    }

    // Refresh activity clock
    session.lastActivityAt = new Date();
    await session.save();

    req.user = user;
    req.session = session;
    next();
  } catch (err) {
    next(err);
  }
};
