// Database reset for testing.
// Clears ALL users (including test patients), sessions, and OTP records,
// then re-seeds the staff accounts (doctors/admin/lab/pharmacy).
//
// Run:  npm run reset-db
//
// After this you can sign up again with any email/CNIC you used before.

const mongoose = require('mongoose');
const env = require('../src/config/env');
const User = require('../src/modules/auth/models/User');
const Session = require('../src/modules/auth/models/Session');
const PasswordReset = require('../src/modules/auth/models/PasswordReset');
const Token = require('../src/modules/patient/models/Token');
const Appointment = require('../src/modules/patient/models/Appointment');
const Order = require('../src/modules/patient/models/Order');

const DEFAULT_PASSWORD = 'SehatLine@123';

const STAFF = [
  { name: 'Dr. Ayesha Khan',   email: 'dr.ayesha@sehatline.pk',    role: 'doctor',     phone: '3001112233' },
  { name: 'Dr. Bilal Ahmed',   email: 'dr.bilal@sehatline.pk',     role: 'doctor',     phone: '3004445566' },
  { name: 'System Administrator', email: 'admin@sehatline.pk',     role: 'admin',      phone: '3007778899' },
  { name: 'Lab Tech - Sara Malik', email: 'lab.sara@sehatline.pk', role: 'laboratory', phone: '3009990011' },
  { name: 'Lab Tech - Usman Raza', email: 'lab.usman@sehatline.pk',role: 'laboratory', phone: '3002223344' },
  { name: 'Pharmacist - Hina Shah', email: 'pharma.hina@sehatline.pk',  role: 'pharmacy', phone: '3005556677' },
  { name: 'Pharmacist - Ali Nawaz', email: 'pharma.ali@sehatline.pk',   role: 'pharmacy', phone: '3008889900' },
];

const c = { green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m', bold: '\x1b[1m', reset: '\x1b[0m' };

async function run() {
  await mongoose.connect(env.mongoUri);
  console.log(`\n${c.green}Connected to: ${mongoose.connection.name}${c.reset}\n`);

  // 1) Delete everything (including patient records, so nothing is orphaned)
  const users = await User.deleteMany({});
  const sessions = await Session.deleteMany({});
  const otps = await PasswordReset.deleteMany({});
  const tokens = await Token.deleteMany({});
  const appointments = await Appointment.deleteMany({});
  const orders = await Order.deleteMany({});

  console.log(`${c.yellow}Cleared all data:${c.reset}`);
  console.log(`  ${c.gray}•${c.reset} Users deleted:           ${users.deletedCount}`);
  console.log(`  ${c.gray}•${c.reset} Sessions deleted:        ${sessions.deletedCount}`);
  console.log(`  ${c.gray}•${c.reset} Password resets deleted: ${otps.deletedCount}`);
  console.log(`  ${c.gray}•${c.reset} Tokens deleted:          ${tokens.deletedCount}`);
  console.log(`  ${c.gray}•${c.reset} Appointments deleted:    ${appointments.deletedCount}`);
  console.log(`  ${c.gray}•${c.reset} Orders deleted:          ${orders.deletedCount}\n`);

  // 2) Re-seed staff accounts
  console.log(`${c.cyan}Re-seeding staff accounts...${c.reset}`);
  for (const s of STAFF) {
    await User.create({
      name: s.name,
      email: s.email,
      password: DEFAULT_PASSWORD,
      role: s.role,
      phone: s.phone,
      isVerified: true,
      accountStatus: 'active',
    });
  }

  console.log(`\n${c.cyan}${'─'.repeat(60)}${c.reset}`);
  console.log(`${c.cyan}${c.bold}  STAFF ACCOUNTS (password for all: ${DEFAULT_PASSWORD})${c.reset}`);
  console.log(`${c.cyan}${'─'.repeat(60)}${c.reset}`);
  STAFF.forEach((s) => {
    console.log(`  ${s.role.padEnd(11)} ${s.email}`);
  });
  console.log(`${c.cyan}${'─'.repeat(60)}${c.reset}`);
  console.log(`\n${c.green}✔ Database reset complete. You can now sign up fresh.${c.reset}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
