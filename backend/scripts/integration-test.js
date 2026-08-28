// ─────────────────────────────────────────────────────────────────────────────
// SehatLine — LIVE integration test of the queue system against MongoDB.
// Exercises the EXACT production code (priority.service, queue.engine, and the
// token.controller internals) end-to-end: priority ordering, elderly-50+, load
// division by doctors, persisted estimated wait, and the adaptive measured pace.
// All test rows are tagged 'IT-…' and deleted afterwards.
//
//   node scripts/integration-test.js
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const env = require('../src/config/env');
const Token = require('../src/modules/patient/models/Token');
const { computePriority, orderByPriority } = require('../src/modules/patient/services/priority.service');
const { mmsMetrics } = require('../src/modules/patient/services/queue.engine');
const token = require('../src/modules/patient/controllers/token.controller');
const { serversFor, estimateWaitMin, measureServiceMin, getServiceMin } = token._internals;

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? '  — ' + detail : ''}`); }
}

(async () => {
  await mongoose.connect(env.mongoUri);
  const RUN = `IT-${Date.now().toString(36)}`;
  const tagRe = new RegExp('^' + RUN);
  const uid = new mongoose.Types.ObjectId();

  console.log('\n1) Priority assessment (the exact live rules)');
  const p70chest = computePriority({ age: 70, conditions: ['chest pain'] });
  const p50 = computePriority({ age: 50 });
  const p49 = computePriority({ age: 49 });
  const p30 = computePriority({ age: 30 });
  const pPreg = computePriority({ age: 28, isPregnant: true });
  check('Chest pain -> critical (served first)', p70chest.level === 'critical', p70chest.level);
  check('Age 50 -> elderly priority', p50.level === 'elderly', p50.level);
  check('Age 49 -> normal (below elderly cutoff)', p49.level === 'normal', p49.level);
  check('Pregnant -> high priority', pPreg.level === 'high', pPreg.level);
  check('Critical score > elderly > normal', p70chest.score > p50.score && p50.score > p30.score,
    `${p70chest.score}/${p50.score}/${p30.score}`);

  console.log('\n2) Queue ordering (priority first, FCFS within a class)');
  const now = Date.now();
  const set = [
    { tokenNumber: `${RUN}-a`, priorityScore: p30.score, priorityLevel: 'normal', issuedAt: new Date(now + 1000) },
    { tokenNumber: `${RUN}-b`, priorityScore: p50.score, priorityLevel: 'elderly', issuedAt: new Date(now + 2000) },
    { tokenNumber: `${RUN}-c`, priorityScore: p70chest.score, priorityLevel: 'critical', issuedAt: new Date(now + 3000) },
    { tokenNumber: `${RUN}-d`, priorityScore: p30.score, priorityLevel: 'normal', issuedAt: new Date(now) }, // earlier normal
  ];
  const ordered = orderByPriority(set);
  check('Critical is served first', ordered[0].tokenNumber === `${RUN}-c`, ordered[0].tokenNumber);
  check('Elderly (50+) ahead of normal', ordered[1].tokenNumber === `${RUN}-b`, ordered[1].tokenNumber);
  check('Equal-priority normals keep FCFS (earlier first)', ordered[2].tokenNumber === `${RUN}-d`, ordered[2].tokenNumber);

  console.log('\n3) Load auto-divides across doctors');
  const wait4 = estimateWaitMin(9, 4, 6);   // position 9, 4 doctors, 6 min
  const wait8 = estimateWaitMin(9, 8, 6);   // same, 8 doctors
  check('More doctors -> shorter wait', wait8 < wait4, `4 docs:${wait4}m  8 docs:${wait8}m`);
  check('Position 1 waits 0 min', estimateWaitMin(1, 4, 6) === 0);
  const s = await serversFor('chronic_opd');
  check('serversFor(chronic_opd) counts on-duty doctors (>=1)', s >= 1, `s=${s}`);

  console.log('\n4) Real DB: tokens persist priority + estimated wait');
  const docs = [
    { user: uid, tokenNumber: `${RUN}-t1`, department: 'chronic_opd', status: 'in-queue', priorityScore: p30.score, priorityLevel: 'normal' },
    { user: uid, tokenNumber: `${RUN}-t2`, department: 'chronic_opd', status: 'in-queue', priorityScore: p70chest.score, priorityLevel: 'critical' },
  ];
  await Token.insertMany(docs);
  const mine = orderByPriority(await Token.find({ tokenNumber: tagRe, status: 'in-queue' }));
  const svc = await getServiceMin('chronic_opd');
  const ops = mine.map((t, i) => ({ updateOne: { filter: { _id: t._id }, update: { $set: { position: i + 1, estimatedWaitMin: estimateWaitMin(i + 1, s, svc) } } } }));
  await Token.bulkWrite(ops);
  const t2 = await Token.findOne({ tokenNumber: `${RUN}-t2` }).lean();
  const t1 = await Token.findOne({ tokenNumber: `${RUN}-t1` }).lean();
  check('Critical token is position 1', t2.position === 1, `pos=${t2.position}`);
  check('Estimated wait persisted on tokens', typeof t1.estimatedWaitMin === 'number', `${t1.estimatedWaitMin}`);

  console.log('\n5) Adaptive pace: measures real consultation duration');
  const consultDocs = [];
  for (let i = 0; i < 8; i++) {
    const t0 = new Date(now - 30 * 60000);
    consultDocs.push({
      user: uid, tokenNumber: `${RUN}-c${i}`, department: 'chronic_opd', status: 'pharmacy',
      history: [
        { department: 'chronic_opd', status: 'in-progress', at: t0, note: 'Doctor started consultation' },
        { department: 'chronic_opd', status: 'pharmacy', at: new Date(t0.getTime() + 5 * 60000), note: 'Proceed to pharmacy' },
      ],
    });
  }
  await Token.insertMany(consultDocs);
  const measured = await measureServiceMin('chronic_opd', 6);
  check('Measured pace reflects ~5-min consults', measured >= 3 && measured <= 8, `measured=${measured} min`);

  console.log('\n6) M/M/s snapshot is sane at a realistic load');
  const m = mmsMetrics(40, 15, 4); // 40/hr, 4 min service (15/hr), 4 doctors
  check('Utilisation between 0 and 1', m.rho > 0 && m.rho < 1, `rho=${m.rho}`);
  check('Avg wait is a finite number', isFinite(m.Wq), `Wq=${m.Wq} min`);
  check('System reports stable at this load', m.stable === true);

  // cleanup
  await Token.deleteMany({ tokenNumber: tagRe });

  console.log('\n' + '─'.repeat(52));
  console.log(fail === 0 ? `✅ INTEGRATION PASSED — ${pass}/${pass} checks green.` : `❌ ${fail} check(s) failed (${pass} passed).`);
  console.log('─'.repeat(52));
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
