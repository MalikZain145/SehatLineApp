// Notification controller — the patient's bell menu.

const Notification = require('../models/Notification');
const User = require('../../auth/models/User');
const { deliverDueTip } = require('../services/healthTips.service');
const { deliverDueMedReminders } = require('../services/medReminder.service');
const { sendPush } = require('../../../services/push.service');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

// Has the user turned notifications OFF in Settings?
function notificationsDisabled(user) {
  return !!user && user.preferences && user.preferences.notifications === false;
}

// GET /api/patient/notifications
// Fetching the list is also when we lazily create the health tip that's due
// for the current slot (morning/evening), so the patient always finds it
// waiting without needing a cron job or push service.
async function listNotifications(req, res, next) {
  try {
    // Only generate new health tips / med reminders if the user hasn't turned
    // notifications off.
    if (!notificationsDisabled(req.user)) {
      await deliverDueTip(req.user);
      await deliverDueMedReminders(req.user);
    }

    // Exclude expired notifications (e.g. a Loan Prescription past its 3-day
    // validity) even before the TTL job removes them.
    const notExpired = { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] };
    const notifications = await Notification.find({ user: req.user._id, ...notExpired })
      .sort({ createdAt: -1 })
      .limit(50);

    const unread = await Notification.countDocuments({ user: req.user._id, read: false, ...notExpired });

    return res.json({ success: true, notifications, unread });
  } catch (err) {
    next(err);
  }
}

// GET /api/patient/notifications/unread-count
// Cheap enough to poll for the badge on the bell icon.
async function unreadCount(req, res, next) {
  try {
    if (!notificationsDisabled(req.user)) {
      await deliverDueTip(req.user);
      await deliverDueMedReminders(req.user);
    }
    const notExpired = { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] };
    const unread = await Notification.countDocuments({ user: req.user._id, read: false, ...notExpired });
    return res.json({ success: true, unread });
  } catch (err) {
    next(err);
  }
}

// GET /api/notifications — role-neutral list for ANY signed-in user (staff use
// this for their bell). Unlike the patient list it does NOT deliver health tips
// or med reminders — it just returns what's in the box.
async function listMine(req, res, next) {
  try {
    const notExpired = { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] };
    const notifications = await Notification.find({ user: req.user._id, ...notExpired })
      .sort({ createdAt: -1 }).limit(50).lean();
    const unread = await Notification.countDocuments({ user: req.user._id, read: false, ...notExpired });
    return res.json({ success: true, unread, notifications });
  } catch (err) { next(err); }
}

// POST /api/patient/notifications/:id/read
async function markRead(req, res, next) {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { read: true } },
      { new: true }
    );
    if (!n) return fail(res, 404, 'Notification not found', 'NOT_FOUND');
    return res.json({ success: true, notification: n });
  } catch (err) {
    next(err);
  }
}

// POST /api/patient/notifications/read-all
async function markAllRead(req, res, next) {
  try {
    const r = await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );
    return res.json({ success: true, updated: r.modifiedCount || 0 });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/patient/notifications/:id
async function removeNotification(req, res, next) {
  try {
    const r = await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
    if (!r.deletedCount) return fail(res, 404, 'Notification not found', 'NOT_FOUND');
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// Helper other controllers call to push a notification to a patient.
// Fire-and-forget: a failure here must never break the action that caused it.
async function notifyUser(userId, { type, title, body, icon, screen, refId, refRole, category, expiresAt }) {
  try {
    // Respect the user's choice: if they turned notifications off, don't push
    // (create) any new notification for them.
    const u = await User.findById(userId).select('preferences pushTokens').lean();
    if (notificationsDisabled(u)) return null;
    const n = await Notification.create({ user: userId, type, title, body, icon, screen, refId: refId || '', refRole: refRole || '', category: category || '', expiresAt: expiresAt || null });

    // Also deliver a real push so it arrives while the app is CLOSED. Strip any
    // leading emoji from the title for the OS banner. Fire-and-forget; prune any
    // dead device tokens the push service reports.
    const tokens = Array.isArray(u?.pushTokens) ? u.pushTokens : [];
    if (tokens.length) {
      sendPush(tokens, {
        title: String(title || 'SehatLine').replace(/^\p{Emoji}\s*/u, ''),
        body: body || '',
        data: { screen: screen || '', refId: refId || '', type: type || '' },
      }).then((r) => {
        if (r.invalidTokens && r.invalidTokens.length) {
          User.updateOne({ _id: userId }, { $pull: { pushTokens: { $in: r.invalidTokens } } }).catch(() => {});
        }
      }).catch(() => {});
    }
    return n;
  } catch (err) {
    logger.warn(`Could not create notification for ${userId}: ${err.message}`);
    return null;
  }
}

module.exports = {
  listNotifications, unreadCount, listMine, markRead, markAllRead, removeNotification, notifyUser,
};
