// MedReminderLog — records that a medicine reminder was already delivered for
// a given (prescription, medicine, slot, day), so the lazy delivery never
// sends the same reminder twice. Mirrors how health tips dedupe by slot/day.

const mongoose = require('mongoose');

const medReminderLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
    medicine: { type: String, required: true },
    slot: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
    slotDate: { type: String, required: true }, // 'YYYY-MM-DD'
  },
  { timestamps: true }
);

// One reminder per medicine per slot per day per patient.
medReminderLogSchema.index(
  { user: 1, prescription: 1, medicine: 1, slot: 1, slotDate: 1 },
  { unique: true }
);

module.exports = mongoose.model('MedReminderLog', medReminderLogSchema);
