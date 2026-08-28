// Doctor PROFILE — powers DoctorProfileScreen & DoctorEditProfileScreen.
//   GET   /api/doctor/profile        → the logged-in doctor's account
//   PATCH /api/doctor/profile        → edit name / phone / photo

const User = require('../../auth/models/User');
const Doctor = require('../../patient/models/Doctor');

async function getProfile(req, res) {
  const safe = req.user.toSafeJSON();
  // Merge the patient-facing bookable Doctor row's working days/slots so the
  // Edit Profile screen can show the doctor their current availability.
  try {
    if (req.user.doctorId) {
      const d = await Doctor.findOne({ doctorId: req.user.doctorId }).select('availableDays slots active').lean();
      if (d) { safe.availableDays = d.availableDays || []; safe.slots = d.slots || []; }
    }
  } catch (e) { /* ignore */ }
  return res.json({ success: true, doctor: safe });
}

async function updateProfile(req, res, next) {
  try {
    // The doctor CANNOT change department/category here — those are the admin's
    // routing decisions. They edit their own identity/clinical details.
    const allowed = [
      'name', 'phone', 'profilePic',
      'specialization', 'designation', 'employeeId', 'hospital', 'room',
      'qualification', 'experience', 'pmdcRegistration', 'workingHours',
    ];
    const doc = await User.findById(req.user._id);
    for (const k of allowed) if (req.body[k] !== undefined) doc[k] = req.body[k];
    await doc.save();

    // Sync the patient-facing bookable Doctor row (name/specialization/room/…)
    // and ACTIVATE it once the doctor has completed the essentials — this is how
    // an admin-created "empty" account becomes visible/bookable to patients.
    if (doc.doctorId) {
      const name = String(doc.name || '').trim();
      const specialization = String(doc.specialization || '').trim();
      const set = {
        name, specialization,
        room: doc.room || '',
        qualifications: doc.qualification || '',
        experienceYears: Number(String(doc.experience || '').replace(/[^\d.]/g, '')) || 0,
      };
      if (name && specialization) set.active = true; // profile complete → bookable
      // Working days the doctor picked — patients can only book on these. Sunday
      // is excluded (hospital closed) and the booking layer enforces it too.
      if (Array.isArray(req.body.availableDays)) {
        const VALID = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const days = [...new Set(req.body.availableDays)].filter((d) => VALID.includes(d));
        if (days.length) set.availableDays = days;   // ignore an empty pick (keeps existing days)
      }
      await Doctor.updateOne({ doctorId: doc.doctorId }, { $set: set });
    }

    return res.json({ success: true, message: 'Profile updated', doctor: doc.toSafeJSON() });
  } catch (err) { next(err); }
}

// GET /api/doctor/settings → the doctor's synced workspace settings.
async function getSettings(req, res, next) {
  try {
    const doc = await User.findById(req.user._id).select('doctorSettings').lean();
    return res.json({ success: true, settings: doc?.doctorSettings || {} });
  } catch (err) { next(err); }
}

// PATCH /api/doctor/settings → save one or more settings.
async function updateSettings(req, res, next) {
  try {
    const allowed = [
      'notifications', 'reminders', 'queueUpdates',
      'consultationDuration', 'notesTemplate', 'autoSaveNotes', 'acceptEmergency',
    ];
    const doc = await User.findById(req.user._id);
    if (!doc.doctorSettings) doc.doctorSettings = {};
    for (const k of allowed) if (req.body[k] !== undefined) doc.doctorSettings[k] = req.body[k];
    doc.markModified('doctorSettings');
    await doc.save();
    return res.json({ success: true, message: 'Settings saved', settings: doc.doctorSettings });
  } catch (err) { next(err); }
}

module.exports = { getProfile, updateProfile, getSettings, updateSettings };
