// BloodRequest model — Blood Donor Network.
//
// Any patient can post an emergency blood request; the app finds
// CNIC-verified, opted-in, currently-eligible donors with a compatible
// blood group and notifies them. A donor taps "I Can Donate" to respond,
// which shares their contact with the requester so they can coordinate
// directly — the app is the matchmaker, not the middleman.

const mongoose = require('mongoose');
const { BLOOD_GROUPS } = require('../services/blood.service');

const URGENCY = ['critical', 'urgent', 'normal'];
const STATUSES = ['active', 'fulfilled', 'cancelled', 'expired'];

const bloodRequestSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Who needs the blood — often a relative, not the requester themselves.
    patientName: { type: String, trim: true, default: '' },

    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true, index: true },
    unitsNeeded: { type: Number, default: 1, min: 1, max: 20 },

    hospital: { type: String, trim: true, required: true },
    city: { type: String, trim: true, required: true, index: true },
    contactPhone: { type: String, trim: true, required: true },
    notes: { type: String, trim: true, default: '' },

    urgency: { type: String, enum: URGENCY, default: 'urgent', index: true },
    status: { type: String, enum: STATUSES, default: 'active', index: true },

    // Donors who tapped "I Can Donate".
    responders: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        phone: String,
        bloodGroup: String,
        respondedAt: { type: Date, default: Date.now },
      },
    ],

    notifiedDonorCount: { type: Number, default: 0 },

    // Requests auto-expire so the feed never fills with stale asks.
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

bloodRequestSchema.statics.URGENCY = URGENCY;
bloodRequestSchema.statics.STATUSES = STATUSES;

bloodRequestSchema.index({ status: 1, bloodGroup: 1 });
bloodRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
