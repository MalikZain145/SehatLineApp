// Account controller — deactivation and deletion.
//
// Two very different things, deliberately kept apart:
//
//   Deactivate — reversible. The account is hidden and cannot sign in, but
//   nothing is destroyed. Signing in again restores it. This is what most
//   people actually want when they say "delete my account".
//
//   Delete — permanent. Everything the patient owns goes with it. Because a
//   hospital record isn't only theirs, we keep nothing behind: the CNIC and
//   card number are freed, so they could register again from scratch.
//
// Both require the password. An unlocked phone left on a table shouldn't be
// enough to erase someone's medical history.

const User = require('../models/User');
const Session = require('../models/Session');
const PasswordReset = require('../models/PasswordReset');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

// Patient-owned records that must go when the account does.
async function purgePatientData(userId) {
  const results = {};
  const collections = [
    ['tokens', '../../patient/models/Token'],
    ['appointments', '../../patient/models/Appointment'],
    ['orders', '../../patient/models/Order'],
    ['notifications', '../../patient/models/Notification'],
  ];

  for (const [name, modulePath] of collections) {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const Model = require(modulePath);
      const r = await Model.deleteMany({ user: userId });
      results[name] = r.deletedCount || 0;
    } catch (e) {
      // A missing model shouldn't strand the deletion.
      logger.warn(`Could not purge ${name}: ${e.message}`);
      results[name] = 0;
    }
  }
  return results;
}

// ── POST /api/auth/account/deactivate  body: { password } ─────────────────
async function deactivateAccount(req, res, next) {
  try {
    const { password } = req.body;
    if (!password) return fail(res, 400, 'Enter your password to continue.', 'MISSING');

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return fail(res, 404, 'User not found', 'NOT_FOUND');

    const ok = await user.comparePassword(password);
    if (!ok) return fail(res, 401, 'That password is incorrect.', 'BAD_PASSWORD');

    user.accountStatus = 'deactivated';
    await user.save();

    // Sign out everywhere.
    await Session.deleteMany({ user: user._id });

    logger.warn(`Account deactivated: ${user.email}`);
    return res.json({
      success: true,
      message: 'Your account has been deactivated. Sign in again at any time to restore it.',
    });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/auth/account  body: { password, confirm } ─────────────────
async function deleteAccount(req, res, next) {
  try {
    const { password, confirm } = req.body;
    if (!password) return fail(res, 400, 'Enter your password to continue.', 'MISSING');

    // A second, typed confirmation. Deleting a medical record shouldn't be a
    // single mis-tap away.
    if (String(confirm || '').trim().toUpperCase() !== 'DELETE') {
      return fail(res, 400, 'Type DELETE to confirm.', 'NOT_CONFIRMED');
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return fail(res, 404, 'User not found', 'NOT_FOUND');

    const ok = await user.comparePassword(password);
    if (!ok) return fail(res, 401, 'That password is incorrect.', 'BAD_PASSWORD');

    // Patients only — staff accounts are managed by an administrator.
    if (user.role !== 'patient') {
      return fail(res, 403, 'Staff accounts must be removed by an administrator.', 'NOT_PATIENT');
    }

    const email = user.email;
    const purged = await purgePatientData(user._id);

    await Session.deleteMany({ user: user._id });
    await PasswordReset.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });

    logger.warn(`Account DELETED: ${email} — ${JSON.stringify(purged)}`);
    return res.json({
      success: true,
      message: 'Your account and all associated records have been permanently deleted.',
      purged,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/auth/account/summary ─────────────────────────────────────────
// What deletion would remove — shown before the user commits to it.
async function accountSummary(req, res, next) {
  try {
    const counts = {};
    const collections = [
      ['tokens', '../../patient/models/Token'],
      ['appointments', '../../patient/models/Appointment'],
      ['orders', '../../patient/models/Order'],
      ['notifications', '../../patient/models/Notification'],
    ];
    for (const [name, modulePath] of collections) {
      try {
        // eslint-disable-next-line global-require, import/no-dynamic-require
        const Model = require(modulePath);
        counts[name] = await Model.countDocuments({ user: req.user._id });
      } catch (e) {
        counts[name] = 0;
      }
    }
    return res.json({ success: true, counts, memberSince: req.user.createdAt });
  } catch (err) {
    next(err);
  }
}

module.exports = { deactivateAccount, deleteAccount, accountSummary };
