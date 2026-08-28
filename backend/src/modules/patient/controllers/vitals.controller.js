// Vitals controller — log readings and get the local health analysis.

const Vital = require('../models/Vital');
const { analyze } = require('../services/vitals.analysis');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

// Coerce a value to a number, or null if blank/invalid.
function num(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// POST /api/patient/vitals
// Every field optional; at least one reading required.
async function createVital(req, res, next) {
  try {
    const b = req.body || {};
    const doc = {
      user: req.user._id,
      recordedAt: b.recordedAt ? new Date(b.recordedAt) : new Date(),
      systolic: num(b.systolic),
      diastolic: num(b.diastolic),
      heartRate: num(b.heartRate),
      temperature: num(b.temperature),
      spo2: num(b.spo2),
      respiratoryRate: num(b.respiratoryRate),
      weight: num(b.weight),
      bloodSugar: num(b.bloodSugar),
      bloodSugarType: ['fasting', 'random', 'post_meal'].includes(b.bloodSugarType) ? b.bloodSugarType : '',
      notes: (b.notes || '').trim(),
    };

    // Every field is optional — the patient can log whatever they have. We
    // only block a completely empty save (no reading and no note).
    const readingKeys = ['systolic', 'diastolic', 'heartRate', 'temperature', 'spo2', 'respiratoryRate', 'weight', 'bloodSugar'];
    const hasAny = readingKeys.some((k) => doc[k] != null) || !!doc.notes;
    if (!hasAny) return fail(res, 400, 'Please enter at least one reading or a note.', 'EMPTY');

    const vital = await Vital.create(doc);
    logger.db('INSERT', 'Vital', `${req.user.email} logged vitals`);
    return res.status(201).json({ success: true, message: 'Vitals saved.', vital });
  } catch (err) {
    next(err);
  }
}

// GET /api/patient/vitals — my readings, newest first.
async function listVitals(req, res, next) {
  try {
    const vitals = await Vital.find({ user: req.user._id }).sort({ recordedAt: -1 }).limit(200);
    return res.json({ success: true, vitals });
  } catch (err) {
    next(err);
  }
}

// GET /api/patient/vitals/analysis — the local health analysis.
async function getAnalysis(req, res, next) {
  try {
    const vitals = await Vital.find({ user: req.user._id }).sort({ recordedAt: 1 }).limit(500).lean();
    const analysis = analyze(vitals);
    return res.json({ success: true, analysis });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/patient/vitals/:id
async function deleteVital(req, res, next) {
  try {
    const r = await Vital.deleteOne({ _id: req.params.id, user: req.user._id });
    if (!r.deletedCount) return fail(res, 404, 'Reading not found', 'NOT_FOUND');
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { createVital, listVitals, getAnalysis, deleteVital };
