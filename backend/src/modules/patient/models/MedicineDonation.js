// MedicineDonation model — the Medicine Donation Bank.
//
// Chronic care in Pakistan is expensive, and patients often finish a course
// with sealed, in-date medicine left over. Here a patient DONATES that
// surplus; another patient who needs it can browse by name/city and CLAIM
// it, which shares contact details so they coordinate a handover directly.
// Same community model as the Blood Donor Network — the app is the
// matchmaker, not the middleman.

const mongoose = require('mongoose');

const STATUSES = ['available', 'claimed', 'given', 'expired', 'removed'];

const medicineDonationSchema = new mongoose.Schema(
  {
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    medicineName: { type: String, required: true, trim: true, index: true },
    form: { type: String, default: '' },          // tablet / syrup / inhaler / injection …
    quantity: { type: String, default: '' },      // e.g. '2 strips (20 tablets)'
    // Stored as 'YYYY-MM' — donated medicine must be in date.
    expiry: { type: String, default: '' },

    city: { type: String, required: true, trim: true, index: true },
    contactPhone: { type: String, required: true, trim: true },
    notes: { type: String, default: '', trim: true },

    // Sealed/unopened is the safe default the app nudges donors toward.
    sealed: { type: Boolean, default: true },

    status: { type: String, enum: STATUSES, default: 'available', index: true },

    // Who claimed it (contact shared with the donor on claim).
    claimedBy: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String,
      phone: String,
      at: Date,
    },
  },
  { timestamps: true }
);

medicineDonationSchema.statics.STATUSES = STATUSES;
medicineDonationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('MedicineDonation', medicineDonationSchema);
