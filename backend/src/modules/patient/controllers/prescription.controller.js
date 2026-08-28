// Patient-facing prescriptions — the records a doctor issued to THIS patient.
// Read-only: the patient can list their prescriptions ("My Prescriptions") and
// open one to see the medicines, tests and its live pharmacy status.
//
//   GET /api/patient/prescriptions       → list (newest first)
//   GET /api/patient/prescriptions/:id    → one (must belong to the patient)

const Prescription = require('../models/Prescription');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

const STATUS_LABEL = {
  pending: 'Waiting at pharmacy',
  preparing: 'Being prepared',
  ready: 'Ready for pickup',
  dispensed: 'Dispensed',
};

function shape(p) {
  return {
    id: String(p._id),
    tokenNumber: p.tokenNumber,
    chronicIllness: p.chronicIllness || '',
    doctor: p.doctor || {},
    medicines: p.medicines || [],
    tests: p.tests || [],
    notes: p.notes || '',
    pharmacyStatus: p.pharmacyStatus,
    statusLabel: STATUS_LABEL[p.pharmacyStatus] || 'Waiting at pharmacy',
    counter: p.pharmacyCounter || '',
    labStatus: p.labStatus || 'none',
    dispensedAt: p.dispensedAt || null,
    createdAt: p.createdAt,
  };
}

// GET /api/patient/prescriptions
async function myPrescriptions(req, res, next) {
  try {
    const rows = await Prescription.find({ user: req.user._id })
      .sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ success: true, count: rows.length, prescriptions: rows.map(shape) });
  } catch (err) { next(err); }
}

// GET /api/patient/prescriptions/:id
async function getPrescription(req, res, next) {
  try {
    const p = await Prescription.findById(req.params.id).lean();
    if (!p) return fail(res, 404, 'Prescription not found.', 'NOT_FOUND');
    // Ownership: a patient may only view their own prescriptions.
    if (String(p.user) !== String(req.user._id)) {
      return fail(res, 403, 'This prescription does not belong to you.', 'FORBIDDEN');
    }
    return res.json({ success: true, prescription: shape(p) });
  } catch (err) { next(err); }
}

module.exports = { myPrescriptions, getPrescription };
