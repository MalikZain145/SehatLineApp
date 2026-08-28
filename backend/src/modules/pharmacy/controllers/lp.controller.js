// Pharmacy → Loan Prescription (LP). Generated ONLY when a prescribed medicine
// is out of stock. Records the out-of-stock items (name + quantity the doctor
// prescribed) for the patient to buy locally, and saves it to the patient.

const Prescription = require('../../patient/models/Prescription');
const LoanPrescription = require('../models/LoanPrescription');
const { checkAvailability } = require('../services/availability.service');
const { notifyUser } = require('../../patient/controllers/notification.controller');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

async function nextLpNumber() {
  const year = new Date().getFullYear();
  const count = await LoanPrescription.countDocuments();
  return `LP-${year}-${String(count + 1).padStart(5, '0')}`;
}

// POST /api/pharmacy/prescriptions/:id/lp
async function createLP(req, res, next) {
  try {
    const p = await Prescription.findById(req.params.id).lean();
    if (!p) return fail(res, 404, 'Prescription not found.', 'NOT_FOUND');

    const { items, hasOutOfStock } = await checkAvailability(p.medicines);
    if (!hasOutOfStock) {
      return fail(res, 400, 'All medicines are in stock — no Loan Prescription needed.', 'IN_STOCK');
    }

    const outItems = items.filter((i) => !i.available).map((i) => ({
      name: i.name,
      quantity: i.quantity || '',
      note: 'Out of stock — local purchase',
    }));

    const lpNumber = await nextLpNumber();
    const lp = await LoanPrescription.create({
      lpNumber,
      user: p.user,
      prescription: p._id,
      tokenNumber: p.tokenNumber,
      patientName: p.patient?.name || '',
      doctorName: p.doctor?.name || '',
      items: outItems,
      reason: 'out_of_stock',
      createdByName: req.user.name || 'Pharmacist',
    });

    notifyUser(p.user, {
      type: 'order', title: 'Loan Prescription issued',
      body: `Some medicines were out of stock. LP ${lpNumber} lists what to purchase locally: ${outItems.map((i) => i.name).join(', ')}. (Valid for 3 days.)`,
      icon: 'document-text', screen: 'TokenJourneyScreen',
      // The LP notification is valid for 3 days, then it disappears.
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });

    logger.db('CREATE', 'LoanPrescription', `${lpNumber} for ${p.tokenNumber}`);
    try { const io = req.app.get('io'); if (io) io.emit('pharmacy:update', { type: 'lp' }); } catch (e) { /* ignore */ }
    return res.json({ success: true, message: `Loan Prescription ${lpNumber} created.`, lp });
  } catch (err) { next(err); }
}

// GET /api/pharmacy/lp  — recent LPs
async function listLP(req, res, next) {
  try {
    const lps = await LoanPrescription.find().sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ success: true, count: lps.length, lps });
  } catch (err) { next(err); }
}

module.exports = { createLP, listLP };
