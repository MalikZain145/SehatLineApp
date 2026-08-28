// HealthCamp model — Free Health Camps & Screening Drives.
//
// Government hospitals regularly run FREE screening camps (diabetes, blood
// pressure, eye, hepatitis, etc.), but patients rarely hear about them in
// time. This lists upcoming camps at the hospital and nearby so chronic
// patients can find and register for free screening — something no consumer
// app in Pakistan does. Camps are admin-managed in future; seedable now.

const mongoose = require('mongoose');

const CATEGORIES = ['Diabetes', 'Blood Pressure', 'Eye', 'Hepatitis', 'Heart', 'General', 'Dental', 'Women Health'];

const healthCampSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, default: 'General', index: true },
    description: { type: String, default: '' },

    date: { type: String, required: true, index: true }, // 'YYYY-MM-DD'
    startTime: { type: String, default: '09:00' },        // 'HH:mm'
    endTime: { type: String, default: '13:00' },

    venue: { type: String, default: 'Capital Hospital, G-6/2' },
    city: { type: String, default: 'Islamabad', index: true },
    organizer: { type: String, default: 'Capital Hospital (CDA)' },

    free: { type: Boolean, default: true },
    capacity: { type: Number, default: 0 },   // 0 = unlimited

    active: { type: Boolean, default: true },

    // Who created the camp. Doctors (chronic or OPD) can run their own awareness
    // camps; this lets a doctor manage the camps they created. Empty = seeded/admin.
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    createdByName: { type: String, default: '' },
    createdByRole: { type: String, default: '' },

    // Patients who registered interest (contact kept so the camp desk can
    // confirm; the count also shows demand).
    registrants: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        phone: String,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

healthCampSchema.statics.CATEGORIES = CATEGORIES;
healthCampSchema.index({ active: 1, date: 1 });

module.exports = mongoose.model('HealthCamp', healthCampSchema);
