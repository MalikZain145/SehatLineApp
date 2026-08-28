// Announcement — a broadcast the admin sends to staff (doctors, pharmacists,
// laboratory). Stored for the admin's own record; delivery is a per-recipient
// notification created at send time (so it lands in each staffer's bell).

const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    // Kind of notice: General / Meeting / Circular / Emergency / Duty.
    type: { type: String, default: 'General' },
    // Which staff roles it went to. 'all' expands to doctor+pharmacy+laboratory.
    audience: { type: [String], default: ['all'] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String, default: 'Administration' },
    recipients: { type: Number, default: 0 },  // how many staff it reached
  },
  { timestamps: true }
);

module.exports = mongoose.model('Announcement', announcementSchema);
