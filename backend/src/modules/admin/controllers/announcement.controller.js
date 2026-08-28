// Admin → Announcements. The admin composes a message and picks the audience
// (doctors / pharmacists / laboratory / all). We store it and fan it out as a
// real notification to every staff member in those roles, so it appears in
// their notification bell — a genuine end-to-end broadcast, no mock.

const User = require('../../auth/models/User');
const Announcement = require('../models/Announcement');
const { notifyUser } = require('../../patient/controllers/notification.controller');
const logger = require('../../../utils/logger');

const STAFF_ROLES = ['doctor', 'pharmacy', 'laboratory'];
// Where each role's app opens the notification (their own bell/feed screen).
const ROLE_SCREEN = { doctor: 'AdminNotifications', pharmacy: 'Notifications', laboratory: 'Notifications' };

// Announcement kinds and the Ionicons used for each in the staff bell. The
// category is carried on the notification so staff can filter by it.
const TYPE_META = {
  General:   { icon: 'megaphone' },
  Meeting:   { icon: 'people-outline' },
  Circular:  { icon: 'document-text-outline' },
  Emergency: { icon: 'alert-circle-outline' },
  Duty:      { icon: 'briefcase-outline' },
};
const normalizeType = (t) => {
  const key = String(t || '').trim();
  return TYPE_META[key] ? key : 'General';
};

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

function resolveRoles(audience) {
  const list = Array.isArray(audience) ? audience : [audience].filter(Boolean);
  if (!list.length || list.includes('all')) return [...STAFF_ROLES];
  return list.filter((r) => STAFF_ROLES.includes(r));
}

// POST /api/admin/announcements   body: { title, body, audience:[...] }
async function createAnnouncement(req, res, next) {
  try {
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    if (!title || !body) return fail(res, 400, 'Both a title and a message are required.', 'VALIDATION');
    const roles = resolveRoles(req.body?.audience);
    if (!roles.length) return fail(res, 400, 'Pick at least one audience.', 'NO_AUDIENCE');
    const type = normalizeType(req.body?.type);
    const icon = TYPE_META[type].icon;

    const staff = await User.find({ role: { $in: roles } }).select('_id role').lean();

    // Fan out — one notification per staff member. Respects each user's
    // notification preference (notifyUser skips those who turned them off).
    // `category` carries the kind of notice so staff can filter their bell.
    await Promise.all(staff.map((u) => notifyUser(u._id, {
      type: 'system',
      title: `📢 ${title}`,
      body,
      icon,
      category: type,
      screen: ROLE_SCREEN[u.role] || 'Notifications',
    })));

    const ann = await Announcement.create({
      title, body, type, audience: roles,
      createdBy: req.user._id, createdByName: req.user.name || 'Administration',
      recipients: staff.length,
    });

    logger.db('CREATE', 'Announcement', `${req.user.email} → ${roles.join(',')} (${staff.length} staff)`);
    try { const io = req.app.get('io'); if (io) io.emit('admin:update', { type: 'announcements' }); } catch (e) { /* ignore */ }
    return res.json({ success: true, message: `Announcement sent to ${staff.length} staff member(s).`, announcement: ann });
  } catch (err) { next(err); }
}

// GET /api/admin/announcements — the admin's sent history.
async function listAnnouncements(req, res, next) {
  try {
    const rows = await Announcement.find().sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ success: true, count: rows.length, announcements: rows });
  } catch (err) { next(err); }
}

// DELETE /api/admin/announcements/:id — remove from the admin's record.
async function deleteAnnouncement(req, res, next) {
  try {
    const r = await Announcement.findByIdAndDelete(req.params.id);
    if (!r) return fail(res, 404, 'Announcement not found.', 'NOT_FOUND');
    return res.json({ success: true, message: 'Announcement deleted.' });
  } catch (err) { next(err); }
}

module.exports = { createAnnouncement, listAnnouncements, deleteAnnouncement };
