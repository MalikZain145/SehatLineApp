// One-off repair: existing follow-up (reports-review) tokens were routed by the
// old illness→doctor mapping (often the on-duty GP) instead of back to the
// doctor who actually ordered the lab tests. This re-pins every active follow-up
// token to that prescribing doctor, read from the patient's most recent
// completed lab-requesting visit.
//
//   node seed/fix-followup-doctor.js

const mongoose = require('mongoose');
const env = require('../src/config/env');
const Token = require('../src/modules/patient/models/Token');

async function run() {
  await mongoose.connect(env.mongoUri);
  const followUps = await Token.find({ isFollowUp: true, status: { $nin: ['completed', 'cancelled'] } });
  let fixed = 0;
  for (const t of followUps) {
    // The visit that generated the reports: latest completed one that asked for labs.
    // eslint-disable-next-line no-await-in-loop
    const src = await Token.findOne({
      user: t.user, status: 'completed', 'assignedDoctor.doctorId': { $ne: '' },
      $or: [{ labRequested: true }, { prescribedTests: { $exists: true, $ne: [] } }],
    }).sort({ completedAt: -1 }).lean();
    if (!src || !src.assignedDoctor?.doctorId) {
      console.log(`- ${t.tokenNumber}: no prescribing visit found, left as-is`);
      continue;
    }
    if (t.assignedDoctor?.doctorId === src.assignedDoctor.doctorId) {
      console.log(`- ${t.tokenNumber}: already routed to ${src.assignedDoctor.doctorId}`);
      continue;
    }
    const from = t.assignedDoctor?.doctorId || '(none)';
    t.assignedDoctor = {
      doctorId: src.assignedDoctor.doctorId,
      name: src.assignedDoctor.name || '',
      specialization: src.assignedDoctor.specialization || '',
      room: src.assignedDoctor.room || '',
    };
    if (!t.chronicIllness && src.chronicIllness) t.chronicIllness = src.chronicIllness;
    t.log(`Follow-up re-routed to prescribing doctor ${src.assignedDoctor.name} (${src.assignedDoctor.doctorId})`);
    // eslint-disable-next-line no-await-in-loop
    await t.save();
    fixed++;
    console.log(`\x1b[32m✔ ${t.tokenNumber}: ${from} → ${src.assignedDoctor.doctorId} (${src.assignedDoctor.name})\x1b[0m`);
  }
  console.log(`\nDone. ${fixed} follow-up token(s) re-routed of ${followUps.length} active.`);
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
