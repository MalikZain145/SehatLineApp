// Laboratory → live queue. The queue IS the prescriptions that carry lab tests
// and whose patient has reached the lab (their Token is at department
// 'laboratory'). The lab tech collects the sample, processes it, then completes
// with a report — which creates a LabReport (instantly visible to the patient,
// with analysis) and finishes the patient's token journey.

const Prescription = require('../../patient/models/Prescription');
const Token = require('../../patient/models/Token');
const LabReport = require('../../patient/models/LabReport');
const User = require('../../auth/models/User');
const LabInventory = require('../models/LabInventory');
const LabTest = require('../models/LabTest');
const { notifyUser } = require('../../patient/controllers/notification.controller');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function broadcast(req) {
  try {
    const io = req.app.get('io');
    if (io) { io.emit('laboratory:update', { type: 'queue' }); io.emit('queue:update', { department: 'laboratory' }); }
  } catch (e) { /* ignore */ }
}

// labStatus → UI status label (matches the lab module screens).
const STATUS_LABEL = { pending: 'Waiting', collected: 'Sample Collected', processing: 'Processing', completed: 'Completed' };
// UI label / action → labStatus.
const LABEL_STATUS = {
  'Waiting': 'pending', 'Sample Collected': 'collected', 'Processing': 'processing', 'Completed': 'completed',
  collected: 'collected', processing: 'processing', completed: 'completed',
};

// The counter the serving lab tech is at, formatted for the patient.
function counterLabel(user) {
  const c = String(user?.counterNumber || '').trim();
  if (!c) return 'the laboratory counter';
  return /^\d+$/.test(c) ? `Counter ${c}` : c;
}

// Prescriptions currently in the lab (their token is at the lab and tests are
// not yet completed), newest-last so the earliest waits first.
async function labQueueRows() {
  const rows = await Prescription.find({
    labStatus: { $in: ['pending', 'collected', 'processing'] },
    tests: { $exists: true, $ne: [] },
  }).sort({ createdAt: 1 }).limit(200).lean();
  if (!rows.length) return [];
  const toks = await Token.find({ _id: { $in: rows.map((r) => r.token) } }).select('status department').lean();
  const tokMap = Object.fromEntries(toks.map((t) => [String(t._id), t]));
  return rows.filter((r) => {
    const tok = tokMap[String(r.token)];
    // Chronic OPD: gated by the live token — only patients who took AND kept
    // their lab token (a cancel flips the token off 'laboratory' → removed).
    if (tok) return tok.status === 'laboratory';
    // Cardiology appointment: no OPD token exists; the pharmacy's dispense set
    // labQueued, which carries them into the queue.
    return r.labQueued === true;
  });
}

// GET /api/laboratory/queue
async function getQueue(req, res, next) {
  try {
    const rows = await labQueueRows();
    const queue = rows.map((p) => ({
      id: String(p._id),
      cardNo: p.patient?.cdaCard || p.patient?.cnic || p.tokenNumber || '',
      patientName: p.patient?.name || 'Patient',
      doctorName: p.doctor?.name || '',
      tokenNumber: p.tokenNumber,
      testName: (p.tests || []).join(', '),
      tests: p.tests || [],
      status: STATUS_LABEL[p.labStatus] || 'Waiting',
      labStatus: p.labStatus,
      counter: p.labCounter || '',
      time: new Date(p.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
    }));
    return res.json({
      success: true,
      waiting: queue.filter((q) => q.labStatus === 'pending').length,
      collected: queue.filter((q) => q.labStatus === 'collected').length,
      processing: queue.filter((q) => q.labStatus === 'processing').length,
      count: queue.length,
      queue,
    });
  } catch (err) { next(err); }
}

// GET /api/laboratory/prescriptions/:id — full details for the test-detail sheet.
async function getPrescription(req, res, next) {
  try {
    const p = await Prescription.findById(req.params.id).lean();
    if (!p) return fail(res, 404, 'Record not found.', 'NOT_FOUND');
    // Attach reference parameters for each test from the catalog (so the report
    // form can prefill parameter rows + normal ranges).
    const catalog = await LabTest.find({ name: { $in: p.tests || [] } }).lean();
    const byName = Object.fromEntries(catalog.map((t) => [t.name.toLowerCase(), t]));
    const tests = (p.tests || []).map((name) => ({
      name,
      parameters: byName[name.toLowerCase()]?.parameters || [],
      sampleType: byName[name.toLowerCase()]?.sampleType || '',
    }));
    return res.json({
      success: true,
      record: {
        id: String(p._id),
        tokenNumber: p.tokenNumber,
        patient: p.patient,
        doctor: p.doctor,
        chronicIllness: p.chronicIllness,
        notes: p.notes,
        status: STATUS_LABEL[p.labStatus] || 'Waiting',
        labStatus: p.labStatus,
        counter: p.labCounter || '',
        tests,
      },
    });
  } catch (err) { next(err); }
}

// POST /api/laboratory/queue/:id/status  { status: 'Sample Collected'|'Processing' }
async function updateStatus(req, res, next) {
  try {
    const target = LABEL_STATUS[String(req.body?.status || '').trim()];
    if (!target || !['collected', 'processing'].includes(target)) {
      return fail(res, 400, 'Status must be Sample Collected or Processing.', 'INVALID');
    }
    const p = await Prescription.findById(req.params.id);
    if (!p) return fail(res, 404, 'Record not found.', 'NOT_FOUND');
    if (p.labStatus === 'completed') return fail(res, 400, 'Already completed.', 'DONE');

    p.labStatus = target;
    if (req.user.counterNumber) p.labCounter = String(req.user.counterNumber).trim();
    await p.save();

    const label = counterLabel(req.user);
    if (target === 'collected') {
      notifyUser(p.user, {
        type: 'lab', title: 'You have been called to the laboratory',
        body: `Please proceed to ${label} for your ${(p.tests || []).join(', ')} sample (Token ${p.tokenNumber}).`,
        icon: 'flask', screen: 'LabDashboard', refId: String(p._id),
      });
    } else {
      notifyUser(p.user, {
        type: 'lab', title: 'Test processing',
        body: `Your test${(p.tests || []).length > 1 ? 's are' : ' is'} being processed (Token ${p.tokenNumber}). You will be notified when the report is ready.`,
        icon: 'hourglass', screen: 'LabDashboard', refId: String(p._id),
      });
    }
    logger.db('UPDATE', 'Prescription', `${p.tokenNumber} lab → ${target}`);
    broadcast(req);
    return res.json({ success: true, message: `Marked ${STATUS_LABEL[target]}.`, status: STATUS_LABEL[target] });
  } catch (err) { next(err); }
}

// POST /api/laboratory/queue/:id/complete
// body: { title?, category?, results?: [{name,value,unit,refLow,refHigh,refText}], remarks? }
// Creates a LabReport (patient sees it immediately with analysis), marks the
// prescription's lab stage complete, and finishes the patient's token journey.
async function complete(req, res, next) {
  try {
    const b = req.body || {};
    const p = await Prescription.findById(req.params.id);
    if (!p) return fail(res, 404, 'Record not found.', 'NOT_FOUND');
    if (p.labStatus === 'completed') return fail(res, 400, 'Already completed.', 'DONE');

    const title = (b.title && String(b.title).trim()) || (p.tests || []).join(', ') || 'Laboratory Report';
    const results = Array.isArray(b.results) ? b.results.filter((r) => r && r.name && r.value !== undefined && r.value !== '') : [];

    const report = await LabReport.create({
      user: p.user,
      token: p.token,
      reportNumber: b.reportNumber || `L-${Date.now().toString().slice(-4)}`,
      title,
      category: b.category || (p.tests?.[0] ? 'Laboratory' : 'Blood Test'),
      patient: {
        name: p.patient?.name || '',
        age: p.patient?.age || 0,
        gender: b.gender || '',
        cnic: p.patient?.cnic || '',
        mrn: p.patient?.cdaCard || '',
      },
      referredBy: p.doctor?.name || '',
      results,
      remarks: b.remarks || '',
      pdfName: b.pdfName || '',
      pdfData: b.pdfData || '',
      source: 'lab',
      collectedAt: b.collectedAt || new Date(),
      reportedAt: new Date(),
    });

    p.labStatus = 'completed';
    p.labCompletedAt = new Date();
    p.labReport = report._id;
    if (req.user.counterNumber) p.labCounter = String(req.user.counterNumber).trim();
    await p.save();

    // Finish the token journey.
    const token = await Token.findById(p.token);
    if (token && token.status !== 'completed') {
      token.department = 'done';
      token.status = 'completed';
      token.completedAt = new Date();
      token.log('Lab report ready — journey complete');
      await token.save();
    }

    notifyUser(p.user, {
      type: 'lab', title: 'Lab report ready',
      body: `Your ${title} report (Token ${p.tokenNumber}) is ready. Tap to view results and analysis.`,
      icon: 'document-text', screen: 'ReportsScreen', refId: String(report._id),
    });

    logger.db('INSERT', 'LabReport', `${title} for ${p.patient?.name} by ${req.user.email}`);
    broadcast(req);
    return res.status(201).json({ success: true, message: 'Report completed and sent to the patient.', reportId: String(report._id) });
  } catch (err) { next(err); }
}

// GET /api/laboratory/dashboard
async function getDashboard(req, res, next) {
  try {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const rows = await labQueueRows();
    const [completedToday, lowStock, outOfStock, testCount] = await Promise.all([
      Prescription.countDocuments({ labStatus: 'completed', labCompletedAt: { $gte: startOfToday } }),
      LabInventory.countDocuments({ $expr: { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$minimumStock'] }] } }),
      LabInventory.countDocuments({ quantity: { $lte: 0 } }),
      LabTest.countDocuments({ active: true }),
    ]);
    return res.json({
      success: true,
      stats: {
        waiting: rows.filter((r) => r.labStatus === 'pending').length,
        collected: rows.filter((r) => r.labStatus === 'collected').length,
        processing: rows.filter((r) => r.labStatus === 'processing').length,
        inQueue: rows.length,
        completedToday,
        lowStock,
        outOfStock,
        tests: testCount,
      },
    });
  } catch (err) { next(err); }
}

// GET /api/laboratory/completed — recently completed lab reports.
// Only reports the LAB issued (they carry a `token`); patient-seeded demo
// reports (no token) are excluded so the lab's numbers reflect real work.
async function getCompleted(req, res, next) {
  try {
    const rows = await LabReport.find({ source: 'lab' }).sort({ reportedAt: -1 }).limit(100).lean();
    const reports = rows.map((r) => ({
      id: String(r._id),
      reportId: r.reportNumber,
      patientName: r.patient?.name || 'Patient',
      cardNo: r.patient?.mrn || r.patient?.cnic || '',
      testName: r.title,
      doctorName: r.referredBy || '',
      status: 'Completed',
      completedAt: r.reportedAt ? new Date(r.reportedAt).toLocaleString('en-PK') : '',
      resultCount: (r.results || []).length,
    }));
    return res.json({ success: true, count: reports.length, completedReports: reports });
  } catch (err) { next(err); }
}

// POST /api/laboratory/reports/upload
// Upload a report to a patient by CARD NUMBER — no queue/sample needed. The
// card number is read from the PDF (its file name); the report lands in that
// patient's My Reports. If no patient matches the card number → INVALID_CARD.
// body: { cardNo, title?, category?, pdfName?, pdfData? }
async function uploadReport(req, res, next) {
  try {
    const b = req.body || {};
    const card = String(b.cardNo || '').trim();
    if (!card) return fail(res, 400, 'No card number found on the report.', 'NO_CARD');

    const rx = new RegExp(`^${esc(card)}$`, 'i');
    const user = await User.findOne({ $or: [{ cdaCard: rx }, { cnic: rx }] }).lean();
    if (!user) {
      return res.status(404).json({ success: false, code: 'INVALID_CARD', message: `Invalid: no patient found for card number "${card}".`, cardNo: card });
    }

    const title = (b.title && String(b.title).trim()) || 'Laboratory Report';
    const report = await LabReport.create({
      user: user._id,
      reportNumber: b.reportNumber || `L-${Date.now().toString().slice(-4)}`,
      title,
      category: b.category || 'Laboratory',
      patient: { name: user.name || '', cnic: user.cnic || '', mrn: user.cdaCard || '' },
      referredBy: b.referredBy || '',
      pdfName: b.pdfName || '',
      pdfData: b.pdfData || '',
      token: null,          // no queue token — sent purely by card number
      source: 'lab',        // still a lab-issued report
      collectedAt: new Date(),
      reportedAt: new Date(),
    });

    notifyUser(user._id, {
      type: 'lab', title: 'Lab report ready',
      body: `Your ${title} report is ready. Tap to view it in My Reports.`,
      icon: 'document-text', screen: 'ReportsScreen', refId: String(report._id),
    });

    logger.db('INSERT', 'LabReport', `upload for card ${card} (${user.name}) by ${req.user.email}`);
    broadcast(req);
    return res.status(201).json({ success: true, reportId: String(report._id), patient: user.name, cardNo: card });
  } catch (err) { next(err); }
}

module.exports = { getQueue, getPrescription, updateStatus, complete, getDashboard, getCompleted, uploadReport };
