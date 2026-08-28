// Seeds the cardiology doctors (from the app's doctor list) into the DB.
// Run automatically by the main seed, or standalone: node seed/seed-doctors.js

const mongoose = require('mongoose');
const env = require('../src/config/env');
const Doctor = require('../src/modules/patient/models/Doctor');

// Each doctor has their own available days + bookable slots (24h). The admin
// module will manage these; the app reads them so a patient only ever sees
// the days/times a given doctor actually sits.
const DOCTORS = [
  { doctorId: 'cardio_1', name: 'Dr. Ahmed Hassan',  specialization: 'Interventional Cardiologist', department: 'cardiology', experienceYears: 15, room: 'C-101',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], slots: ['09:00', '09:30', '10:00', '10:30', '11:00', '12:00', '12:30'] },
  { doctorId: 'cardio_2', name: 'Dr. Fatima Noor',   specialization: 'Pediatric Cardiologist',      department: 'cardiology', experienceYears: 12, room: 'C-102',
    availableDays: ['Mon', 'Wed', 'Fri'], slots: ['10:00', '10:30', '11:00', '11:30', '12:00'] },
  { doctorId: 'cardio_3', name: 'Dr. Zain Akhtar',   specialization: 'Cardiothoracic Surgeon',       department: 'cardiology', experienceYears: 18, room: 'C-103',
    availableDays: ['Tue', 'Thu', 'Sat'], slots: ['09:00', '09:30', '10:00', '10:30'] },
  { doctorId: 'cardio_4', name: 'Dr. Ayesha Tariq',  specialization: 'Cardiac Electrophysiologist',  department: 'cardiology', experienceYears: 10, room: 'C-104',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu'], slots: ['11:00', '11:30', '12:00', '12:30', '13:00'] },
  { doctorId: 'cardio_5', name: 'Dr. Usman Riaz',    specialization: 'Clinical Cardiologist',        department: 'cardiology', experienceYears: 14, room: 'C-105',
    availableDays: ['Wed', 'Thu', 'Fri', 'Sat'], slots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'] },
];

async function seedDoctors() {
  for (const d of DOCTORS) {
    await Doctor.updateOne({ doctorId: d.doctorId }, { $set: d }, { upsert: true });
  }
  return DOCTORS.length;
}

// Allow running standalone.
if (require.main === module) {
  (async () => {
    await mongoose.connect(env.mongoUri);
    const n = await seedDoctors();
    console.log(`\x1b[32m✔ Seeded ${n} cardiology doctors\x1b[0m`);
    await mongoose.disconnect();
    process.exit(0);
  })();
}

module.exports = { seedDoctors, DOCTORS };
