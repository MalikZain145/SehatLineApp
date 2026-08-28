// Check for duplicate identity values before the new unique indexes apply.
//
// Mongo silently refuses to build a unique index if the collection already
// contains duplicates — so the constraint would never take effect and you'd
// think you were protected when you aren't. Run this once after upgrading.
//
//   npm run check-duplicates
//
// If it finds any, delete the extra accounts (npm run delete-user -- <email>)
// and run it again until it's clean. Then restart the server so Mongoose can
// build the indexes.

const mongoose = require('mongoose');
const env = require('../src/config/env');
const User = require('../src/modules/auth/models/User');

const c = {
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m',
  cyan: '\x1b[36m', gray: '\x1b[90m', bold: '\x1b[1m', reset: '\x1b[0m',
};

const FIELDS = [
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'cnic', label: 'CNIC' },
  { key: 'cdaCard', label: 'CDA Card' },
];

async function run() {
  await mongoose.connect(env.mongoUri);
  console.log(`\n${c.cyan}Checking ${mongoose.connection.name} for duplicate identity values…${c.reset}\n`);

  let totalDupes = 0;

  for (const { key, label } of FIELDS) {
    const dupes = await User.aggregate([
      // Ignore empty values — staff accounts legitimately share ''.
      { $match: { [key]: { $nin: [null, ''] } } },
      { $group: { _id: `$${key}`, count: { $sum: 1 }, users: { $push: { email: '$email', name: '$name' } } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ]);

    if (!dupes.length) {
      console.log(`${c.green}✔${c.reset} ${label.padEnd(10)} no duplicates`);
      continue;
    }

    totalDupes += dupes.length;
    console.log(`${c.red}✖${c.reset} ${label.padEnd(10)} ${dupes.length} duplicated value(s):`);
    for (const d of dupes) {
      console.log(`    ${c.bold}${d._id}${c.reset} — used by ${d.count} accounts:`);
      for (const u of d.users) {
        console.log(`      ${c.gray}•${c.reset} ${u.name} <${u.email}>`);
      }
    }
  }

  console.log('');
  if (totalDupes === 0) {
    console.log(`${c.green}${c.bold}Clean — the unique indexes will build successfully.${c.reset}`);
    console.log(`${c.gray}Restart the server to apply them.${c.reset}\n`);
  } else {
    console.log(`${c.yellow}${c.bold}Found ${totalDupes} duplicated value(s).${c.reset}`);
    console.log(`${c.gray}Remove the extra accounts, then re-run this check:${c.reset}`);
    console.log(`${c.gray}  npm run delete-user -- <email>${c.reset}\n`);
  }

  await mongoose.disconnect();
  process.exit(totalDupes === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error(`${c.red}Check failed:${c.reset}`, err.message);
  process.exit(1);
});
