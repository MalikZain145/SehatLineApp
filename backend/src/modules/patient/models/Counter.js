// Atomic counter — guarantees unique sequential numbers even under
// concurrent requests (prevents two patients getting the same token).
//
// Uses findOneAndUpdate with $inc, which MongoDB performs atomically.

const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "token_daily_2026-07-04"
  seq: { type: Number, default: 0 },
});

// Atomically increment and return the next value.
counterSchema.statics.next = async function next(key) {
  const doc = await this.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
