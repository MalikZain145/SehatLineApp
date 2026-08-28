// Admin → patient management. List patients, classify them as chronic (only
// chronic patients can use the Chronic OPD), and remove accounts.

const User = require('../../auth/models/User');
const { notifyUser } = require('../../patient/controllers/notification.controller');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}
function emit(req, event, payload) {
  try { const io = req.app.get('io'); if (io) io.emit(event, payload || {}); } catch (e) { /* ignore */ }
}

// ── LIST (with optional search + chronic filter) ─────────────────────────────
async function listPatients(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const filter = { role: 'patient' };
    if (req.query.chronic === 'true') filter.isChronic = true;
    if (req.query.chronic === 'false') filter.isChronic = false;
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { cnic: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
      ];
    }
    const patients = await User.find(filter)
      .select('name email phone cnic dob isChronic chronicConditions accountStatus createdAt')
      .sort({ createdAt: -1 }).limit(500).lean();
    const chronicCount = await User.countDocuments({ role: 'patient', isChronic: true });
    const total = await User.countDocuments({ role: 'patient' });
    return res.json({ success: true, total, chronicCount, count: patients.length, patients });
  } catch (err) { next(err); }
}

// ── CLASSIFY CHRONIC ─────────────────────────────────────────────────────────
// PATCH /api/admin/patients/:id/chronic  body: { isChronic: bool }
async function setChronic(req, res, next) {
  try {
    const isChronic = req.body?.isChronic === true || req.body?.isChronic === 'true';
    const user = await User.findOne({ _id: req.params.id, role: 'patient' });
    if (!user) return fail(res, 404, 'Patient not found.', 'NOT_FOUND');

    user.isChronic = isChronic;
    await user.save();

    notifyUser(user._id, {
      type: 'system',
      title: isChronic ? 'Chronic care enabled' : 'Chronic care disabled',
      body: isChronic
        ? 'You can now use the Chronic OPD for your ongoing care.'
        : 'Chronic OPD access has been turned off for your account.',
      icon: isChronic ? 'checkmark-circle' : 'information-circle',
      screen: 'HomeScreen',
    });
    logger.db('UPDATE', 'User', `admin set isChronic=${isChronic} for ${user.email}`);
    emit(req, 'admin:update', { type: 'patients' });
    return res.json({ success: true, message: isChronic ? 'Patient marked as chronic.' : 'Patient unmarked as chronic.', isChronic });
  } catch (err) { next(err); }
}

// ── DELETE PATIENT ────────────────────────────────────────────────────────────
async function deletePatient(req, res, next) {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, role: 'patient' });
    if (!user) return fail(res, 404, 'Patient not found.', 'NOT_FOUND');
    logger.db('DELETE', 'User', `admin removed patient ${user.email}`);
    emit(req, 'admin:update', { type: 'patients' });
    return res.json({ success: true, message: 'Patient account removed.' });
  } catch (err) { next(err); }
}

module.exports = { listPatients, setChronic, deletePatient };
