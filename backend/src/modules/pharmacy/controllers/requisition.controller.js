// Pharmacy → Requisition. The pharmacist requests the admin to procure/restock
// medicine(s). Delivered to the admin as a notification + listed in the Admin
// portal.

const User = require('../../auth/models/User');
const Requisition = require('../models/Requisition');
const { notifyUser } = require('../../patient/controllers/notification.controller');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

// POST /api/pharmacy/requisitions  body: { items:[{name,quantity}], note }
async function createRequisition(req, res, next) {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items.filter((i) => i && i.name) : [];
    const note = String(req.body?.note || '').trim();
    if (!items.length && !note) return fail(res, 400, 'Add at least one medicine or a note.', 'VALIDATION');

    const reqDoc = await Requisition.create({
      fromUser: req.user._id,
      fromName: req.user.name || 'Pharmacist',
      items,
      note,
    });

    // Notify all admins.
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    const summary = items.length ? items.map((i) => {
      const pkg = Number(i.cartons) > 0
        ? `${i.cartons} carton(s)${i.boxesPerCarton ? ` × ${i.boxesPerCarton} box` : ''}${i.unitsPerBox ? ` × ${i.unitsPerBox}/box` : ''}`
        : (i.quantity || '');
      return `${i.name}${i.category ? ` [${i.category}]` : ''}${pkg ? ` — ${pkg}` : ''}`;
    }).join(', ') : note;
    admins.forEach((a) => notifyUser(a._id, {
      type: 'requisition', title: `Medicine requisition from ${req.user.name || 'Pharmacy'}`,
      body: summary, icon: 'cart', screen: 'AdminNotifications', refRole: 'pharmacy',
    }));

    logger.db('CREATE', 'Requisition', `${req.user.email}: ${summary.slice(0, 60)}`);
    try { const io = req.app.get('io'); if (io) io.emit('admin:update', { type: 'requisitions' }); } catch (e) { /* ignore */ }
    return res.json({ success: true, message: 'Requisition sent to admin.', requisition: reqDoc });
  } catch (err) { next(err); }
}

// GET /api/pharmacy/requisitions — this pharmacist's own requisitions
async function myRequisitions(req, res, next) {
  try {
    const rows = await Requisition.find({ fromUser: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ success: true, count: rows.length, requisitions: rows });
  } catch (err) { next(err); }
}

module.exports = { createRequisition, myRequisitions };
