// Reports controller — patient views lab reports + their analysis.
//
// createReport is what the future laboratory module will call. Until that
// exists, seedDemoReports lets a patient populate a couple of realistic
// reports so the view/analysis/PDF flow is fully testable.

const LabReport = require('../models/LabReport');
const { analyzeReport } = require('../services/reports.analysis');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

function computeAge(dob) {
  if (!dob) return 0;
  const m = String(dob).match(/\b(19|20)\d{2}\b/);
  return m ? Math.max(new Date().getFullYear() - parseInt(m[0], 10), 0) : 0;
}

// GET /api/patient/reports — list my reports (light), newest first.
async function listReports(req, res, next) {
  try {
    const reports = await LabReport.find({ user: req.user._id }).sort({ reportedAt: -1 }).lean();
    const items = reports.map((r) => {
      const a = analyzeReport(r);
      return {
        _id: r._id,
        reportNumber: r.reportNumber,
        title: r.title,
        category: r.category,
        referredBy: r.referredBy,
        reportedAt: r.reportedAt,
        overall: a.overall,
        abnormalCount: a.abnormalCount,
        total: a.total,
      };
    });
    const summary = {
      total: items.length,
      normal: items.filter((i) => i.overall === 'Normal').length,
      abnormal: items.filter((i) => i.overall === 'Abnormal').length,
    };
    return res.json({ success: true, reports: items, summary });
  } catch (err) { next(err); }
}

// GET /api/patient/reports/:id — full report + analysis.
async function getReport(req, res, next) {
  try {
    const report = await LabReport.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!report) return fail(res, 404, 'Report not found', 'NOT_FOUND');
    const analysis = analyzeReport(report);
    return res.json({ success: true, report, analysis });
  } catch (err) { next(err); }
}

// POST /api/patient/reports — create a report (future lab module).
async function createReport(req, res, next) {
  try {
    const b = req.body || {};
    if (!b.title || !Array.isArray(b.results) || !b.results.length) {
      return fail(res, 400, 'A title and at least one result are required.', 'INVALID');
    }
    const report = await LabReport.create({
      user: b.userId || req.user._id,
      reportNumber: b.reportNumber || `L-${Date.now().toString().slice(-4)}`,
      title: b.title,
      category: b.category || 'Blood Test',
      patient: b.patient || {
        name: req.user.name, age: computeAge(req.user.dob), cnic: req.user.cnic, mrn: req.user.cdaCard,
      },
      referredBy: b.referredBy || '',
      results: b.results,
      remarks: b.remarks || '',
      collectedAt: b.collectedAt || new Date(),
      reportedAt: b.reportedAt || new Date(),
    });
    return res.status(201).json({ success: true, report });
  } catch (err) { next(err); }
}

// DELETE /api/patient/reports/:id
async function deleteReport(req, res, next) {
  try {
    const r = await LabReport.deleteOne({ _id: req.params.id, user: req.user._id });
    if (!r.deletedCount) return fail(res, 404, 'Report not found', 'NOT_FOUND');
    return res.json({ success: true });
  } catch (err) { next(err); }
}

// POST /api/patient/reports/demo — seed a few realistic reports for testing,
// so the patient can see the view/analysis/PDF flow before the lab module.
async function seedDemoReports(req, res, next) {
  try {
    const existing = await LabReport.countDocuments({ user: req.user._id });
    if (existing > 0) {
      return res.json({ success: true, message: 'You already have reports.', created: 0 });
    }
    const patient = { name: req.user.name, age: computeAge(req.user.dob), gender: '', cnic: req.user.cnic, mrn: req.user.cdaCard };
    const day = (n) => new Date(Date.now() - n * 86400000);

    const demos = [
      {
        title: 'Complete Blood Count (CBC)', category: 'Blood Test', reportNumber: 'L-1042', referredBy: 'Dr. Muhammad Khan',
        collectedAt: day(3), reportedAt: day(3),
        results: [
          { name: 'Hemoglobin', value: '11.2', unit: 'g/dL', refLow: 13.5, refHigh: 17.5 },
          { name: 'WBC Count', value: '7.8', unit: 'x10³/µL', refLow: 4.0, refHigh: 11.0 },
          { name: 'Platelets', value: '245', unit: 'x10³/µL', refLow: 150, refHigh: 400 },
          { name: 'Hematocrit', value: '38', unit: '%', refLow: 40, refHigh: 50 },
        ],
      },
      {
        title: 'Lipid Profile', category: 'Lipid Profile', reportNumber: 'L-1043', referredBy: 'Dr. Sarah Ahmed',
        collectedAt: day(1), reportedAt: day(1),
        results: [
          { name: 'Total Cholesterol', value: '240', unit: 'mg/dL', refHigh: 200 },
          { name: 'LDL Cholesterol', value: '165', unit: 'mg/dL', refHigh: 130 },
          { name: 'HDL Cholesterol', value: '34', unit: 'mg/dL', refLow: 40 },
          { name: 'Triglycerides', value: '190', unit: 'mg/dL', refHigh: 150 },
        ],
      },
      {
        title: 'Blood Sugar (Fasting)', category: 'Blood Test', reportNumber: 'L-1044', referredBy: 'Dr. Muhammad Khan',
        collectedAt: day(0), reportedAt: day(0),
        results: [
          { name: 'Fasting Glucose', value: '92', unit: 'mg/dL', refLow: 70, refHigh: 99 },
          { name: 'HbA1c', value: '5.4', unit: '%', refHigh: 5.7 },
        ],
      },
    ];

    const docs = demos.map((d) => ({ ...d, user: req.user._id, patient }));
    await LabReport.insertMany(docs);
    logger.db('INSERT', 'LabReport', `${docs.length} demo reports for ${req.user.email}`);
    return res.status(201).json({ success: true, message: `${docs.length} sample reports added.`, created: docs.length });
  } catch (err) { next(err); }
}

module.exports = { listReports, getReport, createReport, deleteReport, seedDemoReports };
