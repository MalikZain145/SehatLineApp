// Pharmacy → Admin report. The pharmacist writes a note; it is saved to the
// admin Reports list and delivered to every admin as a notification.
//
//   POST /api/pharmacy/report   body: { message }

const User = require('../../auth/models/User');
const Report = require('../../admin/models/Report');
const { notifyUser } = require('../../patient/controllers/notification.controller');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

async function reportToAdmin(req, res, next) {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) return fail(res, 400, 'Please write your report before sending.', 'BAD_INPUT');
    if (message.length > 2000) return fail(res, 400, 'Report is too long (max 2000 characters).', 'TOO_LONG');

    await Report.create({
      fromUser: req.user._id,
      fromName: req.user.name || 'Pharmacist',
      fromRole: 'pharmacy',
      message,
    });

    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    const title = `Report from ${req.user.name || 'Pharmacist'} (Pharmacy)`;
    admins.forEach((a) => {
      notifyUser(a._id, { type: 'report', title, body: message, icon: 'alert-circle', screen: 'AdminNotifications', refRole: 'pharmacy' });
    });

    try { const io = req.app.get('io'); if (io) io.emit('admin:update', { type: 'reports' }); } catch (e) { /* ignore */ }
    logger.db('CREATE', 'Report', `pharmacy report from ${req.user.email}`);
    return res.json({ success: true, message: 'Your report has been sent to the admin.' });
  } catch (err) { next(err); }
}

module.exports = { reportToAdmin };
