// Delete ONE user and everything linked to them, so the account can be
// recreated from scratch (same email / CNIC / phone / CDA card).
//
// Usage:
//   npm run delete-user -- mzainulabideen918@gmail.com
//   npm run delete-user -- 03001234567          (phone works too)
//   npm run delete-user -- 61101-8524979-7      (so does CNIC)
//
// Add --dry to preview what would be removed without deleting anything:
//   npm run delete-user -- you@gmail.com --dry

const mongoose = require('mongoose');
const env = require('../src/config/env');

const User = require('../src/modules/auth/models/User');
const Session = require('../src/modules/auth/models/Session');
const PasswordReset = require('../src/modules/auth/models/PasswordReset');
const Token = require('../src/modules/patient/models/Token');
const Appointment = require('../src/modules/patient/models/Appointment');
const Order = require('../src/modules/patient/models/Order');

const c = {
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m',
  cyan: '\x1b[36m', gray: '\x1b[90m', bold: '\x1b[1m', reset: '\x1b[0m',
};

// Build a lookup that works whether the user passes an email, phone or CNIC.
function buildQuery(identifier) {
  const id = String(identifier).trim();

  if (id.includes('@')) {
    return { email: id.toLowerCase() };
  }

  const digits = id.replace(/\D/g, '');

  // 13 digits → CNIC (stored with or without dashes, so match both).
  if (digits.length === 13) {
    const dashed = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
    return { $or: [{ cnic: digits }, { cnic: dashed }] };
  }

  // 10–11 digits → phone. It's stored without the leading zero.
  if (digits.length >= 10 && digits.length <= 11) {
    const noLeadingZero = digits.replace(/^0+/, '');
    return { $or: [{ phone: noLeadingZero }, { phone: digits }] };
  }

  // Fall back to the CDA card number.
  return { cdaCard: id };
}

async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry');
  const identifier = args.find((a) => !a.startsWith('--'));

  if (!identifier) {
    console.log(`${c.red}Please pass an email, phone, CNIC or CDA card number.${c.reset}`);
    console.log(`${c.gray}  npm run delete-user -- you@gmail.com${c.reset}`);
    console.log(`${c.gray}  npm run delete-user -- you@gmail.com --dry   (preview only)${c.reset}`);
    process.exit(1);
  }

  await mongoose.connect(env.mongoUri);

  const user = await User.findOne(buildQuery(identifier));
  if (!user) {
    console.log(`${c.yellow}No account found for "${identifier}".${c.reset}`);
    console.log(`${c.gray}Nothing to delete — you can sign up with these details already.${c.reset}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  // Refuse to nuke staff accounts by accident.
  if (user.role !== 'patient') {
    console.log(`${c.red}Refusing to delete a ${user.role} account (${user.email}).${c.reset}`);
    console.log(`${c.gray}This script only removes patient accounts. Use reset-db for staff.${c.reset}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // Count everything linked to this user before touching it.
  const counts = {
    sessions: await Session.countDocuments({ user: user._id }),
    resets: await PasswordReset.countDocuments({ user: user._id }),
    tokens: await Token.countDocuments({ user: user._id }),
    appointments: await Appointment.countDocuments({ user: user._id }),
    orders: await Order.countDocuments({ user: user._id }),
  };

  console.log('');
  console.log(`${c.cyan}${'─'.repeat(60)}${c.reset}`);
  console.log(`${c.bold}  Account found${c.reset}`);
  console.log(`${c.cyan}${'─'.repeat(60)}${c.reset}`);
  console.log(`  Name     ${c.bold}${user.name}${c.reset}`);
  console.log(`  Email    ${user.email}`);
  console.log(`  Phone    ${user.phone || '—'}`);
  console.log(`  CNIC     ${user.cnic || '—'}`);
  console.log(`  CDA Card ${user.cdaCard || '—'}`);
  console.log('');
  console.log(`${c.bold}  Linked records${c.reset}`);
  console.log(`  Sessions       ${counts.sessions}`);
  console.log(`  Password resets ${counts.resets}`);
  console.log(`  Tokens         ${counts.tokens}`);
  console.log(`  Appointments   ${counts.appointments}`);
  console.log(`  Orders         ${counts.orders}`);
  console.log(`${c.cyan}${'─'.repeat(60)}${c.reset}`);

  if (dryRun) {
    console.log(`${c.yellow}  DRY RUN — nothing was deleted.${c.reset}`);
    console.log(`${c.gray}  Re-run without --dry to actually remove this account.${c.reset}\n`);
    await mongoose.disconnect();
    process.exit(0);
  }

  // Delete the linked records first, then the user, so nothing is orphaned
  // if the process dies halfway.
  await Session.deleteMany({ user: user._id });
  await PasswordReset.deleteMany({ user: user._id });
  await Token.deleteMany({ user: user._id });
  await Appointment.deleteMany({ user: user._id });
  await Order.deleteMany({ user: user._id });
  await User.deleteOne({ _id: user._id });

  const total = Object.values(counts).reduce((a, b) => a + b, 0) + 1;
  console.log(`${c.green}  ✔ Deleted the account and ${total - 1} linked record(s).${c.reset}`);
  console.log(`${c.gray}  You can now sign up again with the same email / CNIC / phone.${c.reset}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(`${c.red}Delete failed:${c.reset}`, err.message);
  process.exit(1);
});
