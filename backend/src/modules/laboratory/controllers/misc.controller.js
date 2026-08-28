// Laboratory → profile, requisitions, report-to-admin, and analytics.

const User = require('../../auth/models/User');
const LabRequisition = require('../models/LabRequisition');
const LabInventory = require('../models/LabInventory');
const LabTest = require('../models/LabTest');
const LabReport = require('../../patient/models/LabReport');
const Prescription = require('../../patient/models/Prescription');
const Report = require('../../admin/models/Report');
const { notifyUser } = require('../../patient/controllers/notification.controller');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

// ── Profile ───────────────────────────────────────────────────────────────
async function getProfile(req, res) {
  return res.json({ success: true, profile: req.user.toSafeJSON() });
}

async function updateProfile(req, res, next) {
  try {
    const allowed = ['name', 'phone', 'profilePic', 'department', 'hospital', 'employeeId', 'counterNumber'];
    const doc = await User.findById(req.user._id);
    for (const k of allowed) if (req.body[k] !== undefined) doc[k] = req.body[k];
    await doc.save();
    return res.json({ success: true, message: 'Profile updated', profile: doc.toSafeJSON() });
  } catch (err) { next(err); }
}

// ── Requisitions to admin ───────────────────────────────────────────────────
async function createRequisition(req, res, next) {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items.filter((i) => i && i.name) : [];
    if (!items.length) return fail(res, 400, 'Add at least one item.', 'INVALID');
    const doc = await LabRequisition.create({
      fromUser: req.user._id,
      fromName: req.user.name || 'Laboratory',
      items,
      note: req.body.note || '',
    });
    // Notify admins (same as pharmacy requisitions).
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    const summary = items.map((i) => `${i.name}${i.category ? ` [${i.category}]` : ''}${i.quantity ? ` (${i.quantity})` : ''}`).join(', ');
    admins.forEach((a) => notifyUser(a._id, {
      type: 'requisition', title: `Lab requisition from ${req.user.name || 'Laboratory'}`,
      body: summary, icon: 'cart', screen: 'AdminNotifications', refRole: 'laboratory',
    }));
    try { const io = req.app.get('io'); if (io) io.emit('admin:update', { type: 'requisitions' }); } catch (e) { /* ignore */ }
    return res.status(201).json({ success: true, message: 'Requisition sent to admin.', requisition: doc });
  } catch (err) { next(err); }
}

async function myRequisitions(req, res, next) {
  try {
    const rows = await LabRequisition.find({ fromUser: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ success: true, count: rows.length, requisitions: rows });
  } catch (err) { next(err); }
}

// ── Report a problem to admin (staff report) ────────────────────────────────
async function reportToAdmin(req, res, next) {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) return fail(res, 400, 'Please write your report before sending.', 'BAD_INPUT');
    if (message.length > 2000) return fail(res, 400, 'Report is too long (max 2000 characters).', 'TOO_LONG');
    await Report.create({
      fromUser: req.user._id,
      fromName: req.user.name || 'Laboratory',
      fromRole: 'laboratory',
      message,
    });
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    const title = `Report from ${req.user.name || 'Laboratory'} (Laboratory)`;
    admins.forEach((a) => {
      notifyUser(a._id, { type: 'report', title, body: message, icon: 'alert-circle', screen: 'AdminNotifications', refRole: 'laboratory' });
    });
    try { const io = req.app.get('io'); if (io) io.emit('admin:update', { type: 'reports' }); } catch (e) { /* ignore */ }
    return res.status(201).json({ success: true, message: 'Your report has been sent to the admin.' });
  } catch (err) { next(err); }
}

// ── Analytics ───────────────────────────────────────────────────────────────
// GET /api/laboratory/analytics
async function getAnalytics(req, res, next) {
  try {
    const now = new Date();
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

    const [reportsToday, totalReports, inStock, lowStock, outOfStock, testCount] = await Promise.all([
      Prescription.countDocuments({ labStatus: 'completed', labCompletedAt: { $gte: startOfToday } }),
      LabReport.countDocuments({ source: 'lab' }),
      LabInventory.countDocuments({ $expr: { $gt: ['$quantity', '$minimumStock'] } }),
      LabInventory.countDocuments({ $expr: { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$minimumStock'] }] } }),
      LabInventory.countDocuments({ quantity: { $lte: 0 } }),
      LabTest.countDocuments({ active: true }),
    ]);

    // Weekly completed — Monday to Saturday of THIS week.
    const weekly = [];
    const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monday = new Date(now); monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    for (let i = 0; i < 6; i++) {
      const d0 = new Date(monday); d0.setDate(monday.getDate() + i);
      const d1 = new Date(d0); d1.setDate(d0.getDate() + 1);
      // eslint-disable-next-line no-await-in-loop
      const count = await Prescription.countDocuments({ labStatus: 'completed', labCompletedAt: { $gte: d0, $lt: d1 } });
      weekly.push({ label: WEEK_DAYS[i], count });
    }

    // Test category distribution (from the catalog) — drives a pie.
    const catAgg = await LabTest.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]);
    const categories = catAgg.map((c) => ({ name: c._id || 'General', count: c.count }));

    // Low-stock list (incl. out-of-stock).
    const lowRows = await LabInventory.find({ $expr: { $lte: ['$quantity', '$minimumStock'] } }).sort({ quantity: 1 }).limit(50).lean();
    const lowStockList = lowRows.map((m) => ({ name: m.name, stock: m.quantity, unit: m.unit }));

    // Top tests (across recent completed prescriptions' test names).
    const recent = await Prescription.find({ labStatus: 'completed' }).sort({ labCompletedAt: -1 }).limit(300).select('tests').lean();
    const tally = {};
    recent.forEach((p) => (p.tests || []).forEach((t) => { if (t) tally[t] = (tally[t] || 0) + 1; }));
    const topTests = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

    return res.json({
      success: true,
      overview: { reportsToday, totalReports },
      inventory: { inStock, lowStock, outOfStock },
      tests: testCount,
      weekly, categories, lowStockList, topTests,
      summary: { reportsToday, totalReports },
    });
  } catch (err) { next(err); }
}

module.exports = { getProfile, updateProfile, createRequisition, myRequisitions, reportToAdmin, getAnalytics };
