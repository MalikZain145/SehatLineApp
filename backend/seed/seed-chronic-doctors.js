// Seeds the CHRONIC OPD doctors into the DB, from chronic.config.js.
// Run standalone: node seed/seed-chronic-doctors.js
// (The token flow reads chronic.config directly, so seeding is only needed
//  so the future admin module has real Doctor rows to manage.)

const mongoose = require('mongoose');
const env = require('../src/config/env');
const Doctor = require('../src/modules/patient/models/Doctor');
const { CHRONIC_DOCTORS } = require('../src/modules/patient/services/chronic.config');

async function seedChronicDoctors() {
  for (const d of CHRONIC_DOCTORS) {
    await Doctor.updateOne(
      { doctorId: d.doctorId },
      {
        $set: {
          doctorId: d.doctorId,
          name: d.name,
          specialization: d.specialization,
          department: 'chronic',
          conditions: d.conditions,
          room: d.room,
          active: true,
        },
      },
      { upsert: true }
    );
  }
  return CHRONIC_DOCTORS.length;
}

if (require.main === module) {
  (async () => {
    await mongoose.connect(env.mongoUri);
    const n = await seedChronicDoctors();
    console.log(`\x1b[32m✔ Seeded ${n} chronic OPD doctors\x1b[0m`);
    await mongoose.disconnect();
    process.exit(0);
  })();
}

module.exports = { seedChronicDoctors };
