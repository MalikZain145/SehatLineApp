// Feedback model.
//
// Feedback used to be written to a log line and forgotten. Asking someone to
// tell you what's wrong and then discarding it is worse than not asking.

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // 1–5. Required: a comment without a rating is hard to triage.
    rating: { type: Number, required: true, min: 1, max: 5 },

    // What the feedback is about, so it can be routed.
    category: {
      type: String,
      enum: ['app', 'queue', 'staff', 'facilities', 'other'],
      default: 'app',
      index: true,
    },

    comment: { type: String, default: '', maxlength: 2000 },

    // Set when someone at the hospital has read it.
    reviewed: { type: Boolean, default: false, index: true },

    // Context that makes a report actionable without asking the patient.
    appVersion: { type: String, default: '' },
    platform: { type: String, default: '' },
  },
  { timestamps: true }
);

feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
