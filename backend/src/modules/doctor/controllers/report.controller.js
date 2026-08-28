// Doctor → Admin report. The doctor writes a note; it's delivered to every
// admin as a notification (they read it in their notifications).
//
//   POST /api/doctor/report   body: { message }

const User = require('../../auth/models/User');
const Report = require('../../admin/models/Report');
const { notifyUser } = require('../../patient/controllers/notification.controller');
const logger = require('../../../utils/logger');
const { fail } = require('../services/doctor.service');

async function reportToAdmin(req, res, next) {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) return fail(res, 400, 'Please write your report before sending.', 'BAD_INPUT');
    if (message.length > 2000) return fail(res, 400, 'Report is too long (max 2000 characters).', 'TOO_LONG');

    // Persist so the admin sees it in the Admin portal's Reports list.
    await Report.create({
      fromUser: req.user._id,
      fromName: req.user.name || 'Doctor',
      fromRole: 'doctor',
      message,
    });

    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    const title = `Report from ${req.user.name || 'Doctor'}`;
    admins.forEach((a) => {
      notifyUser(a._id, {
        type: 'report',
        title,
        body: message,
        icon: 'alert-circle',
        screen: 'AdminNotifications',
        refRole: 'doctor',
      });
    });

    // Live-notify the admin portal.
    try { const io = req.app.get('io'); if (io) io.emit('admin:update', { type: 'reports' }); } catch (e) { /* ignore */ }

    logger.db('CREATE', 'Report', `Doctor ${req.user.email} → admin: ${message.slice(0, 60)}`);
    return res.json({
      success: true,
      message: admins.length
        ? 'Your report has been sent to the admin.'
        : 'Your report was recorded (no admin is set up yet).',
      delivered: admins.length,
    });
  } catch (err) { next(err); }
}

module.exports = { reportToAdmin };
