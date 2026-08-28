// Doctor feedback controller.
//
// getPending → the most recent completed visit (chronic token / cardiology
//   appointment) the patient hasn't rated yet. The app shows a mandatory
//   feedback prompt for it before letting them book their next visit.
// submit → save the rating + accountability answers.
//
// findPendingFeedback() is also used by generateToken / bookAppointment to
// BLOCK a new booking until the last visit is rated.

const DoctorFeedback = require('../models/DoctorFeedback');
const Token = require('../models/Token');
const Appointment = require('../models/Appointment');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

// Returns the pending visit needing feedback, or null.
async function findPendingFeedback(userId) {
  // Most recent completed chronic visit where a doctor was actually assigned.
  const chronic = await Token.findOne({
    user: userId, status: 'completed', 'assignedDoctor.name': { $ne: '' },
  }).sort({ completedAt: -1 }).lean();

  // Most recent completed cardiology appointment.
  const cardio = await Appointment.findOne({
    user: userId, status: 'completed',
  }).sort({ updatedAt: -1 }).lean();

  // Pick whichever finished more recently.
  const chronicAt = chronic ? new Date(chronic.completedAt || chronic.updatedAt) : null;
  const cardioAt = cardio ? new Date(cardio.updatedAt) : null;
  let visit = null;
  if (chronicAt && (!cardioAt || chronicAt >= cardioAt)) {
    visit = {
      visitType: 'chronic', visitId: String(chronic._id),
      doctorId: chronic.assignedDoctor?.doctorId || '',
      doctorName: chronic.assignedDoctor?.name || 'the doctor',
      department: 'Chronic OPD',
      date: chronic.completedAt,
    };
  } else if (cardioAt) {
    visit = {
      visitType: 'cardiology', visitId: String(cardio._id),
      doctorId: cardio.doctorId || '',
      doctorName: cardio.doctorName || 'the doctor',
      department: 'Cardiology',
      date: cardio.updatedAt,
    };
  }
  if (!visit) return null;

  // Already rated?
  const rated = await DoctorFeedback.findOne({ user: userId, visitId: visit.visitId }).lean();
  return rated ? null : visit;
}

// GET /api/patient/feedback/pending
async function getPending(req, res, next) {
  try {
    const visit = await findPendingFeedback(req.user._id);
    return res.json({ success: true, pending: !!visit, visit: visit || null });
  } catch (err) { next(err); }
}

// POST /api/patient/feedback
async function submit(req, res, next) {
  try {
    const b = req.body || {};
    if (!b.visitId || !b.visitType) return fail(res, 400, 'Missing visit reference.', 'MISSING');
    const rating = Number(b.rating);
    if (!(rating >= 1 && rating <= 5)) return fail(res, 400, 'Please give a rating from 1 to 5 stars.', 'NO_RATING');

    await DoctorFeedback.updateOne(
      { user: req.user._id, visitId: String(b.visitId) },
      {
        $set: {
          user: req.user._id,
          visitType: b.visitType,
          visitId: String(b.visitId),
          doctorId: b.doctorId || '',
          doctorName: b.doctorName || '',
          department: b.department || '',
          rating,
          harassed: !!b.harassed,
          bothered: !!b.bothered,
          extraCharges: !!b.extraCharges,
          notes: (b.notes || '').trim(),
        },
      },
      { upsert: true }
    );
    logger.db('INSERT', 'DoctorFeedback', `${req.user.email} rated ${b.doctorName || b.visitId} (${rating}★)`);
    return res.json({ success: true, message: 'Thank you for your feedback.' });
  } catch (err) { next(err); }
}

module.exports = { getPending, submit, findPendingFeedback };
