// Settings controller — user preferences, profile picture, biometric,
// and CNIC auto-verification.

const User = require('../models/User');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

// Hours after CNIC upload before the account auto-verifies.
const AUTO_VERIFY_HOURS = 12;

// Check + apply auto-verification if enough time has passed since CNIC upload.
//
// `isVerified` and `accountStatus` answer different questions: one is "did the
// CNIC check pass", the other is "may this account sign in". Writing
// 'verified' into accountStatus conflated them — and wasn't even a valid enum
// value, so the save threw.
async function maybeAutoVerify(user) {
  if (user.isVerified) return user;
  if (!user.cnicUploadedAt) return user;
  const hours = (Date.now() - new Date(user.cnicUploadedAt).getTime()) / (1000 * 60 * 60);
  if (hours >= AUTO_VERIFY_HOURS) {
    user.isVerified = true;
    user.cnicVerified = true;
    await user.save();
    logger.success(`Account auto-verified: ${user.email} (${hours.toFixed(1)}h after CNIC upload)`);
  }
  return user;
}

// ── GET my settings / profile (also triggers auto-verify) ─────────────────
// GET /api/auth/settings
async function getSettings(req, res, next) {
  try {
    let user = await User.findById(req.user._id).select('+fingerprintHash');
    if (!user) return fail(res, 404, 'User not found', 'NOT_FOUND');
    user = await maybeAutoVerify(user);

    return res.json({
      success: true,
      settings: {
        preferences: user.preferences || {},
        profilePic: user.profilePic || '',
        biometricEnabled: user.biometricEnabled || false,
        hasFingerprint: !!user.fingerprintHash,
        isVerified: user.isVerified,
        accountStatus: user.accountStatus,
        cnicUploadedAt: user.cnicUploadedAt,

        // Identity — verified at signup, shown read-only.
        name: user.name,
        email: user.email,
        phone: user.phone,
        cnic: user.cnic,
        cdaCard: user.cdaCard,
        dob: user.dob,

        // Editable by the patient.
        address: user.address,
        bloodGroup: user.bloodGroup,
        emergencyName: user.emergencyName,
        emergencyContact: user.emergencyContact,
        allergies: user.allergies || [],
        chronicConditions: user.chronicConditions || [],

        // Context the patient may want to see.
        memberSince: user.createdAt,
        isPregnant: user.isPregnant,
        hasDisability: user.hasDisability,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── UPDATE preferences (dark mode, notifications, autoSync) ───────────────
// PATCH /api/auth/settings/preferences  body: { darkMode, notifications, autoSync, language }
async function updatePreferences(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 404, 'User not found', 'NOT_FOUND');

    const { darkMode, notifications, autoSync, language } = req.body;
    if (typeof darkMode === 'boolean') user.preferences.darkMode = darkMode;
    if (typeof notifications === 'boolean') user.preferences.notifications = notifications;
    if (typeof autoSync === 'boolean') user.preferences.autoSync = autoSync;
    if (language) user.preferences.language = language;

    await user.save();
    return res.json({ success: true, message: 'Preferences saved.', preferences: user.preferences });
  } catch (err) {
    next(err);
  }
}

// ── UPDATE profile picture ────────────────────────────────────────────────
// PATCH /api/auth/settings/profile-pic  body: { profilePic }  (base64 data URI)
async function updateProfilePic(req, res, next) {
  try {
    const { profilePic } = req.body;
    if (!profilePic) return fail(res, 400, 'No image provided', 'NO_IMAGE');
    // Guard against very large payloads (~2MB base64 limit).
    if (profilePic.length > 3_000_000) {
      return fail(res, 413, 'Image too large. Please choose a smaller photo.', 'TOO_LARGE');
    }
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 404, 'User not found', 'NOT_FOUND');
    user.profilePic = profilePic;
    await user.save();
    return res.json({ success: true, message: 'Profile picture updated.', profilePic: user.profilePic });
  } catch (err) {
    next(err);
  }
}

// ── ENABLE / DISABLE biometric login ──────────────────────────────────────
// POST /api/auth/settings/biometric  body: { enabled, fingerprintHash, password }
// To ENABLE: the user must confirm their password and provide the device's
// fingerprint hash, which we store so a fingerprint login can match them.
async function setBiometric(req, res, next) {
  try {
    const { enabled, fingerprintHash, password } = req.body;
    const user = await User.findById(req.user._id).select('+password +fingerprintHash');
    if (!user) return fail(res, 404, 'User not found', 'NOT_FOUND');

    if (enabled) {
      // Verify password before enabling.
      if (!password) return fail(res, 400, 'Password required to enable biometric login.', 'NO_PASSWORD');
      const ok = await user.comparePassword(password);
      if (!ok) return fail(res, 401, 'Incorrect password.', 'BAD_PASSWORD');
      if (!fingerprintHash) return fail(res, 400, 'Fingerprint data missing.', 'NO_FINGERPRINT');

      // Hash the raw token the SAME way fingerprintLogin does, so a later
      // fingerprint login matches this account.
      const crypto = require('crypto');
      const hashed = crypto.createHash('sha256').update(String(fingerprintHash)).digest('hex');

      // SECURITY: one fingerprint = one account. If this device fingerprint is
      // already enrolled on a DIFFERENT account (any role/module), refuse —
      // otherwise the same finger could unlock someone else's account.
      const clash = await User.findOne({ fingerprintHash: hashed, biometricEnabled: true, _id: { $ne: user._id } }).select('role').lean();
      if (clash) {
        return fail(res, 409, 'This fingerprint is already registered to another account on this device. Disable it there first, or use a different fingerprint.', 'FINGERPRINT_TAKEN');
      }

      user.fingerprintHash = hashed;
      user.biometricEnabled = true;
      await user.save();
      logger.success(`Biometric enabled: ${user.email}`);
      return res.json({ success: true, message: 'Biometric login enabled.' });
    }

    // Disable.
    user.biometricEnabled = false;
    user.fingerprintHash = '';
    await user.save();
    return res.json({ success: true, message: 'Biometric login disabled.' });
  } catch (err) {
    next(err);
  }
}

// ── SUBMIT rating ─────────────────────────────────────────────────────────
// POST /api/auth/settings/rating  body: { rating, comment }
// ── SUBMIT FEEDBACK ───────────────────────────────────────────────────────
// POST /api/auth/settings/rating  body: { rating, category, comment, appVersion, platform }
//
// Rate-limited at the route: without a limit a single patient could fill the
// collection, and there's no reason to submit more than a handful a day.
async function submitRating(req, res, next) {
  try {
    const { rating, category, comment, appVersion, platform } = req.body;

    const score = Number(rating);
    if (!score || score < 1 || score > 5) {
      return fail(res, 400, 'Please choose a rating from 1 to 5.', 'BAD_RATING');
    }

    const VALID = ['app', 'queue', 'staff', 'facilities', 'other'];
    const cat = VALID.includes(category) ? category : 'app';

    // Don't let one person bury the collection.
    const Feedback = require('../../patient/models/Feedback');
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await Feedback.countDocuments({ user: req.user._id, createdAt: { $gte: since } });
    if (recent >= 5) {
      return fail(res, 429, 'You have already sent several messages today. We are reading them.', 'TOO_MANY');
    }

    await Feedback.create({
      user: req.user._id,
      rating: score,
      category: cat,
      comment: String(comment || '').trim().slice(0, 2000),
      appVersion: String(appVersion || '').slice(0, 20),
      platform: String(platform || '').slice(0, 20),
    });

    logger.success(`Feedback from ${req.user.email}: ${score}★ [${cat}]`);
    return res.json({ success: true, message: 'Thank you — your feedback has been recorded.' });
  } catch (err) {
    next(err);
  }
}

// ── CHANGE PASSWORD (while logged in) ─────────────────────────────────────
// POST /api/auth/settings/password  body: { currentPassword, newPassword }
//
// Changing the password invalidates every other session: if someone else had
// the old password, their token should stop working the moment we rotate it.
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return fail(res, 400, 'Both your current and new password are required.', 'MISSING');
    }
    if (newPassword.length < 8) {
      return fail(res, 400, 'Your new password must be at least 8 characters.', 'TOO_SHORT');
    }
    if (currentPassword === newPassword) {
      return fail(res, 400, 'Your new password must be different from the current one.', 'SAME_PASSWORD');
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return fail(res, 404, 'User not found', 'NOT_FOUND');

    const ok = await user.comparePassword(currentPassword);
    if (!ok) return fail(res, 401, 'Your current password is incorrect.', 'BAD_PASSWORD');

    user.password = newPassword;   // hashed by the pre-save hook
    user.mustChangePassword = false; // they've now set their own password
    await user.save();

    // Drop every session except the one making this request.
    try {
      const Session = require('../models/Session');
      await Session.deleteMany({ user: user._id, _id: { $ne: req.session?._id } });
    } catch (e) { /* sessions are best-effort */ }

    logger.success(`Password changed: ${user.email}`);
    return res.json({ success: true, message: 'Password updated. Other devices have been signed out.' });
  } catch (err) {
    next(err);
  }
}

// ── UPDATE PROFILE ────────────────────────────────────────────────────────
// PATCH /api/auth/settings/profile
//
// Only medical and contact details are editable. Name, CNIC, CDA card, email
// and date of birth came off a verified CNIC scan at signup — letting the
// patient rewrite them would silently void that verification, and the hospital
// relies on it to match records.
async function updateProfile(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 404, 'User not found', 'NOT_FOUND');

    const {
      address, bloodGroup, emergencyName, emergencyContact,
      allergies, chronicConditions,
    } = req.body;

    if (address !== undefined) user.address = String(address).trim();

    if (bloodGroup !== undefined) {
      const bg = String(bloodGroup).trim().toUpperCase();
      const VALID = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''];
      if (!VALID.includes(bg)) return fail(res, 400, 'Choose a valid blood group.', 'BAD_BLOOD_GROUP');
      user.bloodGroup = bg;
    }

    if (emergencyName !== undefined) user.emergencyName = String(emergencyName).trim();

    if (emergencyContact !== undefined) {
      const digits = String(emergencyContact).replace(/\D/g, '');
      if (digits && (digits.length < 10 || digits.length > 11)) {
        return fail(res, 400, 'Enter a valid emergency contact number.', 'BAD_PHONE');
      }
      user.emergencyContact = digits;
    }

    // Free-text lists, trimmed and de-duplicated so the queue's priority
    // scoring doesn't double-count "Diabetes" and "diabetes ".
    const cleanList = (arr) => [
      ...new Set(
        (Array.isArray(arr) ? arr : [])
          .map((s) => String(s).trim())
          .filter(Boolean)
          .slice(0, 20)
      ),
    ];

    if (allergies !== undefined) user.allergies = cleanList(allergies);
    if (chronicConditions !== undefined) user.chronicConditions = cleanList(chronicConditions);

    await user.save();
    return res.json({ success: true, message: 'Profile updated.', user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

// ── VERIFY PASSWORD ───────────────────────────────────────────────────────
// POST /api/auth/settings/verify-password  body: { password }
//
// Lets the app confirm the password *before* asking for a fingerprint, so a
// typo is caught at the keyboard instead of after the user has already
// scanned. Rate-limited at the route, since this is a bare password oracle.
async function verifyPassword(req, res, next) {
  try {
    const { password } = req.body;
    if (!password) return fail(res, 400, 'Password is required.', 'MISSING');

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return fail(res, 404, 'User not found', 'NOT_FOUND');

    const ok = await user.comparePassword(password);
    if (!ok) return fail(res, 401, 'That password is incorrect.', 'BAD_PASSWORD');

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/settings/force-password   body: { newPassword }
// First-login password change for staff created with the shared default. Valid
// ONLY while the account is flagged mustChangePassword; the caller is already
// authenticated, so no current password is required (they just used the
// default to sign in). Clears the flag so the blocking prompt goes away.
async function forcePasswordChange(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 8) {
      return fail(res, 400, 'Your new password must be at least 8 characters.', 'TOO_SHORT');
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return fail(res, 404, 'User not found', 'NOT_FOUND');
    if (!user.mustChangePassword) {
      return fail(res, 400, 'A password change is not required for this account.', 'NOT_REQUIRED');
    }
    const same = await user.comparePassword(newPassword);
    if (same) return fail(res, 400, 'Please choose a password different from the default one.', 'SAME_PASSWORD');

    user.password = newPassword;      // hashed by pre-save hook
    user.mustChangePassword = false;
    await user.save();

    try {
      const Session = require('../models/Session');
      await Session.deleteMany({ user: user._id, _id: { $ne: req.session?._id } });
    } catch (e) { /* best-effort */ }

    logger.success(`First-login password set: ${user.email}`);
    return res.json({ success: true, message: 'Password set. You can continue now.' });
  } catch (err) { next(err); }
}

module.exports = {
  getSettings, updatePreferences, updateProfilePic, setBiometric, submitRating,
  changePassword, forcePasswordChange, updateProfile, verifyPassword, maybeAutoVerify,
};
