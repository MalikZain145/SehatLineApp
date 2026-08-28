// Vital model — a single vitals reading logged by a patient.
//
// Every field is OPTIONAL: a patient records only what applies to them (a
// diabetic logs sugar, a hypertensive logs BP, etc.). Multiple readings per
// day are allowed — each row is one point in time. The health analysis
// (vitals.analysis.js) turns a series of these into trends and insights.

const mongoose = require('mongoose');

const vitalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // When the reading was taken (patient can back-date; defaults to now).
    recordedAt: { type: Date, default: Date.now, index: true },

    // ---- Blood pressure (mmHg) ----
    systolic: { type: Number, default: null },
    diastolic: { type: Number, default: null },

    // ---- Other vitals ----
    heartRate: { type: Number, default: null },        // bpm
    temperature: { type: Number, default: null },      // °F
    spo2: { type: Number, default: null },             // %
    respiratoryRate: { type: Number, default: null },  // breaths/min
    weight: { type: Number, default: null },           // kg

    // ---- Blood sugar (mg/dL) ----
    bloodSugar: { type: Number, default: null },
    // Fasting vs random matters for interpretation, so it's captured.
    bloodSugarType: { type: String, enum: ['fasting', 'random', 'post_meal', ''], default: '' },

    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

vitalSchema.index({ user: 1, recordedAt: -1 });

module.exports = mongoose.model('Vital', vitalSchema);
