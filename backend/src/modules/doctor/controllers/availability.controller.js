// Doctor AVAILABILITY — powers DoctorAvailabilityScreen.
//
//   GET   /api/doctor/availability   → this doctor's working days + hours
//   PATCH /api/doctor/availability   → save them
//
// The doctor sets per-day working hours. We store that exact detail AND derive
// `availableDays` + `slots` on the Doctor row, which is what the PATIENT
// booking flow already reads — so whatever the doctor sets is what patients
// can book.

const Doctor = require('../../patient/models/Doctor');
const User = require('../../auth/models/User');
const { fail } = require('../services/doctor.service');

// Full weekday name → the short name the patient booking flow uses.
const SHORT_DAY = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

const DEFAULT_DETAIL = [
  { day: 'Monday', start: '09:00', end: '17:00', available: true },
  { day: 'Tuesday', start: '09:00', end: '17:00', available: true },
  { day: 'Wednesday', start: '09:00', end: '17:00', available: true },
  { day: 'Thursday', start: '09:00', end: '17:00', available: true },
  { day: 'Friday', start: '09:00', end: '13:00', available: true },
  { day: 'Saturday', start: '--:--', end: '--:--', available: false },
  { day: 'Sunday', start: '--:--', end: '--:--', available: false },
];

// '09:00' → minutes since midnight (or null if not a valid time).
function toMin(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim());
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function toHHMM(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// From the per-day detail, derive availableDays (short names) + slots (union of
// each available day's [start,end) at 30-min steps, deduped + sorted).
function derive(detail) {
  const availableDays = [];
  const slotSet = new Set();
  for (const d of detail || []) {
    if (!d || !d.available) continue;
    const short = SHORT_DAY[d.day];
    if (short) availableDays.push(short);
    const s = toMin(d.start), e = toMin(d.end);
    if (s == null || e == null || e <= s) continue;
    for (let t = s; t < e; t += 30) slotSet.add(t);
  }
  const slots = [...slotSet].sort((a, b) => a - b).map(toHHMM);
  return { availableDays, slots };
}

async function getAvailability(req, res, next) {
  try {
    const doctorId = req.user.doctorId;
    const doc = doctorId ? await Doctor.findOne({ doctorId }).lean() : null;
    const detail = (doc?.availabilityDetail?.length ? doc.availabilityDetail : DEFAULT_DETAIL);
    // On-duty: prefer the linked Doctor row; otherwise the account's own flag.
    const active = doc ? (doc.active !== false) : (req.user.onDuty !== false);
    return res.json({
      success: true,
      detail,
      availableDays: doc?.availableDays || [],
      slots: doc?.slots || [],
      active,
    });
  } catch (err) { next(err); }
}

async function updateAvailability(req, res, next) {
  try {
    const doctorId = req.user.doctorId;

    const update = {};
    // Per-day working hours (optional) — needs a linked Doctor row to persist.
    if (Array.isArray(req.body?.detail) && req.body.detail.length) {
      const { availableDays, slots } = derive(req.body.detail);
      update.availabilityDetail = req.body.detail;
      update.availableDays = availableDays;
      update.slots = slots;
    }
    // On-duty status (optional). false → patients can't see/book this doctor.
    let onDuty;
    if (typeof req.body?.active === 'boolean') { update.active = req.body.active; onDuty = req.body.active; }

    if (!Object.keys(update).length) return fail(res, 400, 'Nothing to update.', 'BAD_INPUT');

    // Always mirror duty status onto the account itself, so it works even for
    // doctor accounts that aren't linked to a bookable Doctor row.
    if (typeof onDuty === 'boolean') {
      await User.updateOne({ _id: req.user._id }, { $set: { onDuty } });
    }

    // The schedule detail can only be saved against a Doctor row.
    if (update.availabilityDetail && !doctorId) {
      return fail(res, 400, 'This account is not linked to a bookable doctor for scheduling.', 'NO_DOCTOR');
    }

    const doc = doctorId
      ? await Doctor.findOneAndUpdate({ doctorId }, { $set: update }, { new: true }).lean()
      : null;

    const active = doc ? (doc.active !== false) : (typeof onDuty === 'boolean' ? onDuty : (req.user.onDuty !== false));
    return res.json({
      success: true,
      message: 'Availability updated',
      detail: doc?.availabilityDetail || [],
      availableDays: doc?.availableDays || [],
      slots: doc?.slots || [],
      active,
    });
  } catch (err) { next(err); }
}

module.exports = { getAvailability, updateAvailability };
