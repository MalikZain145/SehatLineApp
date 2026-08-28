// Doctor NOTIFICATIONS — powers DoctorNotificationsScreen.
//
//   GET  /api/doctor/notifications           → important updates for the bell
//   POST /api/doctor/notifications/read-all   → mark everything read
//
// The doctor's bell shows appointments, admin/system announcements and other
// important updates. Token/queue-turn notifications ('token', 'health_tip')
// are deliberately excluded so the live queue isn't duplicated here.

const Notification = require('../../patient/models/Notification');

async function getNotifications(req, res, next) {
  try {
    const IMPORTANT = ['appointment', 'system', 'order', 'report', 'blood_request', 'medication'];
    const items = await Notification.find({ user: req.user._id, type: { $in: IMPORTANT } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const unread = items.filter((n) => !n.read).length;
    return res.json({ success: true, unread, notifications: items });
  } catch (err) { next(err); }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
    return res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { getNotifications, markAllNotificationsRead };
