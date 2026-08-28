// Session model.
// Every successful login creates a session document. We use it to:
//   1) Enforce inactivity timeout (lastActivityAt + SESSION_INACTIVITY_MINUTES)
//   2) Bind the session to a device fingerprint hash (logout if it changes)
//   3) Record the IP the session was created from (shown in terminal)
//
// The JWT carries the sessionId; middleware checks the session is still valid.

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Device fingerprint hash captured at login. If a request arrives whose
    // device fingerprint differs, we invalidate → app logs out.
    fingerprintHash: { type: String, default: '' },

    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },

    lastActivityAt: { type: Date, default: Date.now },

    isActive: { type: Boolean, default: true },

    expiresAt: { type: Date }, // hard expiry (matches JWT expiry)
  },
  { timestamps: true }
);

// Helper: is this session past the inactivity window?
sessionSchema.methods.isInactive = function isInactive(inactivityMinutes) {
  const ms = inactivityMinutes * 60 * 1000;
  return Date.now() - new Date(this.lastActivityAt).getTime() > ms;
};

module.exports = mongoose.model('Session', sessionSchema);
