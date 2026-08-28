// Appointment model — for CARDIOLOGY department bookings.
//
// Rules enforced by the controller:
//   • One patient cannot double-book the SAME date + time (across cardio AND
//     an active chronic token).
//   • A given cardiology slot (date + time + doctor) can be held by only ONE
//     patient.
//
// This is separate from the Chronic OPD *token* flow (see Token.js), which is
// for chronic patients whose journey also includes pharmacy + lab.

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    department: { type: String, default: 'cardiology', index: true },

    doctorId: { type: String, default: '' },     // which cardiologist
    doctorName: { type: String, default: '' },

    // The booked slot.
    date: { type: String, required: true, index: true }, // 'YYYY-MM-DD'
    time: { type: String, required: true },              // 'HH:mm' (24h)

    // Booking lifecycle.
    status: {
      type: String,
      enum: ['booked', 'completed', 'cancelled', 'no-show'],
      default: 'booked',
      index: true,
    },

    reason: { type: String, default: '' },
    notes: { type: String, default: '' },

    // AI/ML triage priority (from the Python ensemble, rule-based fallback).
    // Higher score = should be seen sooner on the appointment day, so elderly
    // and patients with critical recent vitals are attended first.
    priorityScore: { type: Number, default: 0, index: true },
    priorityLevel: { type: String, default: 'normal' },
    prioritySource: { type: String, default: '' },   // 'ml' | 'rule-fallback'

    bookedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Fast lookups for slot-clash checks.
appointmentSchema.index({ date: 1, time: 1, doctorId: 1, status: 1 });
appointmentSchema.index({ user: 1, date: 1, time: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
