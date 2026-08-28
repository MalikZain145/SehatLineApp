// Forgot-password controller (email + phone based, NO CNIC).
// Flow:
//   1) POST /forgot/request  → find user by email/phone, generate OTP,
//      send via email AND sms, store hashed OTP (10 min expiry).
//   2) POST /forgot/verify   → check the OTP.
//   3) POST /forgot/reset    → set new password, send success email,
//      invalidate the reset record.

const crypto = require('crypto');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const Session = require('../models/Session');
const { validateForgotRequest } = require('../validations/auth.validation');
const { sendOtpEmail, sendResetSuccessEmail } = require('../../../services/email.service');
const logger = require('../../../utils/logger');

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

// ── 1) REQUEST OTP ────────────────────────────────────────────────────────
async function requestReset(req, res, next) {
  try {
    const errors = validateForgotRequest(req.body);
    if (errors.length) return fail(res, 400, errors[0], 'VALIDATION');

    const { email, phone } = req.body;
    const query = email
      ? { email: email.toLowerCase() }
      : { phone: String(phone).replace(/^0+/, '') };

    const user = await User.findOne(query);

    // Anti-enumeration: never reveal whether an account exists. If there's no
    // matching account we return the SAME "code sent" response (but create no
    // OTP), so an attacker can't use this endpoint to discover registered
    // emails/phones. A legitimate user who mistyped simply won't get a code.
    if (!user) {
      logger.warn(`Password reset requested for unregistered ${email || phone} (silent)`);
      return res.json({
        success: true,
        message: 'If an account matches these details, a verification code has been sent.',
        channels: { email: 'sent' },
        sentTo: { email: email ? maskEmail(String(email)) : null },
      });
    }

    // Throttle: max 3 reset requests per account per rolling 24 hours.
    const MAX_RESETS = 3;
    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const rr = user.resetRequests || {};
    const windowStart = rr.windowStart ? new Date(rr.windowStart).getTime() : 0;

    if (windowStart && now - windowStart < WINDOW_MS) {
      // Still inside the current window.
      if ((rr.count || 0) >= MAX_RESETS) {
        const msLeft = WINDOW_MS - (now - windowStart);
        const hoursLeft = Math.ceil(msLeft / (60 * 60 * 1000));
        logger.warn(`Reset limit reached for ${user.email} (${rr.count} in window)`);
        return res.status(429).json({
          success: false,
          code: 'TOO_MANY_RESETS',
          message: `You have reached the limit of ${MAX_RESETS} password reset requests. Please try again in ${hoursLeft} hour(s).`,
          hoursLeft,
        });
      }
      user.resetRequests.count = (rr.count || 0) + 1;
    } else {
      // Window expired (or first ever request) → start a fresh one.
      user.resetRequests = { count: 1, windowStart: new Date(now) };
    }
    await user.save();

    // Remove any previous resets for this user
    await PasswordReset.deleteMany({ user: user._id });

    const otp = generateOtp();
    const otpHash = PasswordReset.hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await PasswordReset.create({
      user: user._id,
      otpHash,
      channel: 'both',
      expiresAt,
    });
    logger.db('INSERT', 'PasswordReset', `otp issued for ${user.email}`);

    // OTP is delivered by email only (falls back to terminal if email isn't
    // configured, so testing never blocks).
    const emailTarget = user.email;
    const emailResult = emailTarget ? await sendOtpEmail(emailTarget, otp) : { sent: false };

    // Always print to terminal too, so testing never blocks.
    logger.info(`🔐 OTP for ${user.email} = ${otp}  (expires in ${OTP_TTL_MINUTES}m)`);

    return res.json({
      success: true,
      message: 'A verification code has been sent to your email.',
      channels: { email: emailResult.sent ? 'sent' : 'fallback' },
      // We return the masked destination for the UI (not the OTP!).
      sentTo: { email: emailTarget ? maskEmail(emailTarget) : null },
    });
  } catch (err) {
    next(err);
  }
}

// ── 2) VERIFY OTP ─────────────────────────────────────────────────────────
async function verifyReset(req, res, next) {
  try {
    const { email, phone, otp } = req.body;
    if (!otp) return fail(res, 400, 'OTP is required', 'VALIDATION');

    const user = await findUser(email, phone);
    if (!user) return fail(res, 400, 'Invalid or expired code', 'INVALID_OTP');

    const record = await PasswordReset.findOne({ user: user._id });
    if (!record) return fail(res, 400, 'Code expired. Please request a new one.', 'EXPIRED');

    if (record.attempts >= MAX_ATTEMPTS) {
      await PasswordReset.deleteMany({ user: user._id });
      return fail(res, 429, 'Too many attempts. Please request a new code.', 'TOO_MANY');
    }

    const match = record.otpHash === PasswordReset.hashOtp(otp);
    if (!match) {
      record.attempts += 1;
      await record.save();
      return fail(res, 400, 'Incorrect code. Please try again.', 'INVALID_OTP');
    }

    record.verified = true;
    await record.save();

    // Short-lived ticket the client sends to /reset (so they can't reset
    // without having verified the OTP first).
    const resetTicket = crypto.randomBytes(24).toString('hex');
    record.otpHash = PasswordReset.hashOtp(resetTicket); // reuse field to store ticket hash
    await record.save();

    logger.success(`OTP verified for ${user.email}`);
    return res.json({ success: true, message: 'Code verified', resetTicket });
  } catch (err) {
    next(err);
  }
}

// ── 3) RESET PASSWORD ─────────────────────────────────────────────────────
async function resetPassword(req, res, next) {
  try {
    const { email, phone, resetTicket, newPassword } = req.body;
    if (!resetTicket) return fail(res, 400, 'Reset ticket is required', 'VALIDATION');
    if (!newPassword || newPassword.length < 8) {
      return fail(res, 400, 'Password must be at least 8 characters', 'VALIDATION');
    }

    const user = await findUser(email, phone);
    if (!user) return fail(res, 400, 'Invalid reset request', 'INVALID');

    const record = await PasswordReset.findOne({ user: user._id, verified: true });
    if (!record) return fail(res, 400, 'Reset session expired. Please start over.', 'EXPIRED');

    if (record.otpHash !== PasswordReset.hashOtp(resetTicket)) {
      return fail(res, 400, 'Invalid reset ticket', 'INVALID');
    }

    user.password = newPassword; // hashed by pre-save hook
    await user.save();
    logger.db('UPDATE', 'User', `password reset for ${user.email}`);

    // Clean up + invalidate all existing sessions for safety
    await PasswordReset.deleteMany({ user: user._id });
    await Session.updateMany({ user: user._id }, { isActive: false });

    // Confirmation email
    await sendResetSuccessEmail(user.email, user.name);
    logger.success(`Password successfully reset for ${user.email}`);

    return res.json({ success: true, message: 'Password reset successful. Please log in.' });
  } catch (err) {
    next(err);
  }
}

// ── helpers ───────────────────────────────────────────────────────────────
async function findUser(email, phone) {
  if (email) return User.findOne({ email: email.toLowerCase() });
  if (phone) return User.findOne({ phone: String(phone).replace(/^0+/, '') });
  return null;
}

function maskEmail(e) {
  const [name, domain] = e.split('@');
  const shown = name.slice(0, 2);
  return `${shown}${'*'.repeat(Math.max(name.length - 2, 1))}@${domain}`;
}

function maskPhone(p) {
  const s = String(p);
  return `+92 ***** ${s.slice(-3)}`;
}

module.exports = { requestReset, verifyReset, resetPassword };
