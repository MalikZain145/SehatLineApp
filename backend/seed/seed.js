// Seed script — creates the hardcoded staff accounts.
// Patients are NOT seeded (they sign up in the app).
//
// Run:  npm run seed
//
// It is IDEMPOTENT: running it again updates existing seed accounts
// (by email) instead of creating duplicates.
//
// Passwords:
//   • admin@sehatline.com      → admin123
//   • laboratory@sehatline.com → laboratory123
//   • pharmacy@sehatline.com   → pharmacy123
//   • every doctor + secondary staff account → doctor@123 (the DEFAULT_PASSWORD below)
//
// ⚠️  Change these passwords before any real deployment.

const mongoose = require('mongoose');
const env = require('../src/config/env');
const User = require('../src/modules/auth/models/User');
const Doctor = require('../src/modules/patient/models/Doctor');

const DEFAULT_PASSWORD = 'doctor@123';

// Turn a doctorId ('cardio_1', 'chronic_endo') into a stable login email.
function doctorEmail(doctorId) {
  return `${String(doctorId).replace(/_/g, '.')}@sehatline.pk`;
}

// Give EVERY doctor in the Doctor collection (cardiology + chronic) their own
// login account, so each doctor a patient can book has their own panel. The
// account is linked to the Doctor row via `doctorId`. Idempotent (by email).
async function seedDoctorLogins() {
  const docs = await Doctor.find().lean();
  const created = [];
  for (const d of docs) {
    const email = doctorEmail(d.doctorId);
    const fields = {
      name: d.name,
      role: 'doctor',
      doctorId: d.doctorId,
      specialization: d.specialization || '',
      department: d.department || '',
      isVerified: true,
      accountStatus: 'active',
    };
    let user = await User.findOne({ email }).select('+password');
    if (user) {
      Object.assign(user, fields);
      user.password = DEFAULT_PASSWORD;
      await user.save();
    } else {
      user = await User.create({ email, password: DEFAULT_PASSWORD, ...fields });
    }
    created.push({ email, name: d.name, dept: d.department });
  }
  return created;
}

// ── Hardcoded staff ────────────────────────────────────────────────────────
const STAFF = [
  // Doctors (login with password: SehatLine@123)
  { name: 'Dr. SehatLine',     email: 'doctor@sehatline.com',      role: 'doctor',     phone: '3001234567' },
  { name: 'Dr. OPD',           email: 'doctor@gmail.com',          role: 'doctor',     phone: '3001234568' },
  { name: 'Dr. Ayesha Khan',   email: 'dr.ayesha@sehatline.pk',    role: 'doctor',     phone: '3001112233' },
  { name: 'Dr. Bilal Ahmed',   email: 'dr.bilal@sehatline.pk',     role: 'doctor',     phone: '3004445566' },

  // 1 Admin — full app control (login: admin@sehatline.com / admin123)
  { name: 'System Administrator', email: 'admin@sehatline.com',    role: 'admin',      phone: '3007778899', password: 'admin123' },

  // Laboratory (main login: laboratory@sehatline.com / laboratory123)
  { name: 'CDA Laboratory',        email: 'laboratory@sehatline.com', role: 'laboratory', phone: '3006660000', password: 'laboratory123' },
  { name: 'Lab Tech - Sara Malik', email: 'lab.sara@sehatline.pk', role: 'laboratory', phone: '3009990011' },
  { name: 'Lab Tech - Usman Raza', email: 'lab.usman@sehatline.pk',role: 'laboratory', phone: '3002223344' },

  // Pharmacists (main login: pharmacy@sehatline.com / pharmacy123)
  { name: 'CDA Pharmacy',          email: 'pharmacy@sehatline.com',     role: 'pharmacy', phone: '3005550000', password: 'pharmacy123' },
  { name: 'Pharmacist - Hina Shah', email: 'pharma.hina@sehatline.pk',  role: 'pharmacy', phone: '3005556677' },
  { name: 'Pharmacist - Ali Nawaz', email: 'pharma.ali@sehatline.pk',   role: 'pharmacy', phone: '3008889900' },
];

const c = { green: '\x1b[32m', cyan: '\x1b[36m', yellow: '\x1b[33m', gray: '\x1b[90m', bold: '\x1b[1m', reset: '\x1b[0m' };

// The actual seeding — assumes an ACTIVE mongoose connection. Reused by the CLI
// (npm run seed) AND by the server on first start (auto-seed). Idempotent.
async function seedAll() {
  const results = [];

  for (const s of STAFF) {
    let user = await User.findOne({ email: s.email }).select('+password');

    if (user) {
      // Update basic fields; reset password to default for consistency.
      user.name = s.name;
      user.role = s.role;
      user.phone = s.phone;
      user.password = s.password || DEFAULT_PASSWORD; // re-hashed by pre-save hook
      user.isVerified = true;
      user.accountStatus = 'active';
      await user.save();
      results.push({ ...s, status: 'updated' });
    } else {
      user = await User.create({
        name: s.name,
        email: s.email,
        password: s.password || DEFAULT_PASSWORD,
        role: s.role,
        phone: s.phone,
        isVerified: true,
        accountStatus: 'active',
      });
      results.push({ ...s, status: 'created' });
    }
  }

  // Pretty print the credentials table
  console.log(`${c.cyan}${'─'.repeat(72)}${c.reset}`);
  console.log(`${c.cyan}${c.bold}  SEEDED STAFF ACCOUNTS  (password for all: ${DEFAULT_PASSWORD})${c.reset}`);
  console.log(`${c.cyan}${'─'.repeat(72)}${c.reset}`);
  console.log(`  ${c.bold}ROLE${c.reset}\t\t${c.bold}EMAIL${c.reset}\t\t\t\t${c.bold}STATUS${c.reset}`);
  results.forEach((r) => {
    const rolePad = r.role.padEnd(11);
    const emailPad = r.email.padEnd(30);
    const color = r.status === 'created' ? c.green : c.yellow;
    console.log(`  ${rolePad}\t${emailPad}\t${color}${r.status}${c.reset}`);
  });
  console.log(`${c.cyan}${'─'.repeat(72)}${c.reset}`);
  console.log(`${c.gray}  These are documented in README.md → wire into your app for staff login.${c.reset}\n`);

  // Seed cardiology doctors too.
  try {
    const { seedDoctors } = require('./seed-doctors');
    const n = await seedDoctors();
    console.log(`${c.green}✔ Seeded ${n} cardiology doctors${c.reset}\n`);
  } catch (e) {
    console.log(`${c.gray}(doctor seed skipped: ${e.message})${c.reset}`);
  }

  // Seed chronic OPD doctors (illness → doctor mapping).
  try {
    const { seedChronicDoctors } = require('./seed-chronic-doctors');
    const n = await seedChronicDoctors();
    console.log(`${c.green}✔ Seeded ${n} chronic OPD doctors${c.reset}\n`);
  } catch (e) {
    console.log(`${c.gray}(chronic doctor seed skipped: ${e.message})${c.reset}`);
  }

  // Give every cardiology + chronic doctor their own login account (panel).
  try {
    const logins = await seedDoctorLogins();
    console.log(`${c.green}✔ Seeded ${logins.length} doctor login accounts (password: ${DEFAULT_PASSWORD})${c.reset}`);
    logins.forEach((l) => {
      console.log(`  ${c.gray}${l.dept.padEnd(10)}${c.reset} ${l.email.padEnd(28)} ${l.name}`);
    });
    console.log('');
  } catch (e) {
    console.log(`${c.gray}(doctor login seed skipped: ${e.message})${c.reset}`);
  }

  // Seed pharmacy medicines too.
  try {
    const { seedMedicines } = require('./seed-medicines');
    const m = await seedMedicines();
    console.log(`${c.green}✔ Pharmacy inventory: ${m.created} created, ${m.updated} updated (of ${m.total})${c.reset}\n`);
  } catch (e) {
    console.log(`${c.gray}(medicine seed skipped: ${e.message})${c.reset}`);
  }

  // Seed laboratory test catalog + consumables inventory.
  try {
    const { seedLaboratory } = require('./seed-laboratory');
    const l = await seedLaboratory();
    console.log(`${c.green}✔ Laboratory: ${l.testsCreated}/${l.tests} tests, ${l.inventoryCreated}/${l.inventory} inventory items created${c.reset}\n`);
  } catch (e) {
    console.log(`${c.gray}(laboratory seed skipped: ${e.message})${c.reset}`);
  }

  return results;
}

// CLI entry point (npm run seed): connect, seed, disconnect, exit.
async function run() {
  await mongoose.connect(env.mongoUri);
  console.log(`${c.green}Connected to DB for seeding: ${mongoose.connection.name}${c.reset}\n`);
  await seedAll();
  await mongoose.disconnect();
  process.exit(0);
}

// Only run the CLI flow when executed directly (node seed/seed.js). When the
// server require()s this file for auto-seed, it just imports seedAll().
if (require.main === module) {
  run().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}

module.exports = { seedAll };
