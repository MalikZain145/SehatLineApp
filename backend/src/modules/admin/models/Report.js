// Report — a note a doctor sends to the administration. The admin reads and
// resolves these from the Admin portal.

const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fromName: { type: String, default: '' },
    fromRole: { type: String, default: 'doctor' },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
    // Admin's reply back to the staff member (delivered to them as a notification).
    reply: { type: String, default: '' },
    repliedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
