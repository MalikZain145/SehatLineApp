// DoctorFeedback — the patient's rating of a doctor after a completed visit.
//
// After a doctor visit finishes (a completed Chronic OPD token, or a
// completed cardiology appointment), the patient is asked — before they can
// book their NEXT visit — how it went: a star rating, whether the doctor
// harassed/bothered them or charged extra, and free notes. This is an
// accountability channel the admin can review.

const mongoose = require('mongoose');

const doctorFeedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Which visit this rates (so each visit is rated at most once).
    visitType: { type: String, enum: ['chronic', 'cardiology'], required: true },
    visitId: { type: String, required: true, index: true }, // Token._id or Appointment._id

    doctorId: { type: String, default: '' },
    doctorName: { type: String, default: '' },
    department: { type: String, default: '' },

    rating: { type: Number, min: 1, max: 5, required: true },

    // The three yes/no accountability questions.
    harassed: { type: Boolean, default: false },     // did the doctor harass you?
    bothered: { type: Boolean, default: false },     // did they bother/annoy you?
    extraCharges: { type: Boolean, default: false }, // did they charge extra money?

    notes: { type: String, default: '', trim: true },

    // The doctor's reply to this review (delivered to the patient as a notification).
    doctorReply: { type: String, default: '', trim: true },
    doctorRepliedAt: { type: Date },
  },
  { timestamps: true }
);

doctorFeedbackSchema.index({ user: 1, visitId: 1 }, { unique: true });

module.exports = mongoose.model('DoctorFeedback', doctorFeedbackSchema);
