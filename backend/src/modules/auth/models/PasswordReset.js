// PasswordReset model.
// Holds a short-lived OTP for the forgot-password flow.
// OTP is stored HASHED. It auto-expires via a TTL index.

const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Which channel the OTP was sent through (for UX messaging)
    channel: { type: String, enum: ['email', 'sms', 'both'], default: 'both' },

    // sha256 of the 6-digit OTP
    otpHash: { type: String, required: true },

    attempts: { type: Number, default: 0 }, // wrong-guess counter
    verified: { type: Boolean, default: false },

    // TTL: document is removed automatically after it expires.
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

// Hash an OTP consistently.
passwordResetSchema.statics.hashOtp = function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
};

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
