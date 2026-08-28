// ─────────────────────────────────────────────────────────────────────────
// SehatLine load / stress test.
//
// Answers three things the team asked:
//   1. Does the system hold up with 10,000 doctors in the DB?
//   2. Can we force-book appointments and does a real queue form?
//   3. If 500 patients queue for 5 doctors through THIS app, how long — and
//      how efficiently (queueing theory) — does the queue clear?
//
// Runs against a SEPARATE database (SehatLineLoadTest) so real data is safe.
//   Run:  node scripts/loadtest.js
// ─────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const User = require('../src/modules/auth/models/User');
const Token = require('../src/modules/patient/models/Token');
const Appointment = require('../src/modules/patient/models/Appointment');
const { computePriority, orderByPriority } = require('../src/modules/patient/services/priority.service');
const queueing = require('../src/modules/patient/services/queueing.service');

const TEST_URI = 'mongodb://127.0.0.1:27017/SehatLineLoadTest';
const N_DOCTORS = 10000;
const N_PATIENTS = 500;
const SERVING_DOCTORS = 5;
const AVG_CONSULT_MIN = 10;
const OPD_HOURS = 4;            // 09:00–13:00 clinic session

const ms = (t) => `${(Number(t) / 1000).toFixed(2)}s`;
const hrs = (min) => `${(min / 60).toFixed(1)}h`;
const line = () => console.log('─'.repeat(66));

// A realistic patient mix for a Pakistani chronic-OPD.
function randomPatientFactors() {
  const r = Math.random();
  if (r < 0.15) return { age: 40 + ((Math.random() * 30) | 0), conditions: ['heart disease'] };      // critical
  if (r < 0.35) return { age: 60 + ((Math.random() * 25) | 0), conditions: ['hypertension'] };        // elderly
  return { age: 20 + ((Math.random() * 39) | 0), conditions: ['diabetes'] };                           // normal
}

async function main() {
  const t0 = Date.now();
  await mongoose.connect(TEST_URI);
  console.log('\nConnected to load-test DB:', TEST_URI);
  line();

  // Fresh start.
  await Promise.all([
    User.deleteMany({}), Token.deleteMany({}), Appointment.deleteMany({}),
  ]);

  // ── 1. TEN THOUSAND DOCTORS ───────────────────────────────────────────
  console.log(`\n[1] Seeding ${N_DOCTORS.toLocaleString()} doctors…`);
  const specs = ['Cardiologist', 'Endocrinologist', 'Pulmonologist', 'Nephrologist', 'Rheumatologist'];
  const doctors = Array.from({ length: N_DOCTORS }, (_, i) => ({
    name: `Dr. Load Test ${i + 1}`,
    email: `loadtest.doctor.${i + 1}@sehatline.pk`,
    password: 'x'.repeat(20),           // load test only — not a real login
    role: 'doctor',
    doctorId: `lt_doc_${i + 1}`,
    specialization: specs[i % specs.length],
    department: 'chronic',
  }));
  let t = Date.now();
  await User.insertMany(doctors, { ordered: false });
  const seedDoctorsMs = Date.now() - t;
  console.log(`    inserted in ${ms(seedDoctorsMs)}  (${Math.round(N_DOCTORS / (seedDoctorsMs / 1000)).toLocaleString()} docs/sec)`);

  t = Date.now();
  const docCount = await User.countDocuments({ role: 'doctor', accountStatus: { $ne: 'suspended' } });
  console.log(`    count query over ${docCount.toLocaleString()} doctors: ${ms(Date.now() - t)}  ✓ scales`);

  // ── 2. FORCE-BOOK 500 PATIENTS → REAL QUEUE ───────────────────────────
  console.log(`\n[2] Force-booking ${N_PATIENTS} patients into the chronic-OPD queue…`);
  const patients = Array.from({ length: N_PATIENTS }, (_, i) => ({
    name: `Load Patient ${i + 1}`,
    email: `loadtest.patient.${i + 1}@sehatline.pk`,
    password: 'x'.repeat(20),
    role: 'patient',
  }));
  t = Date.now();
  const insertedPatients = await User.insertMany(patients, { ordered: false });
  console.log(`    ${N_PATIENTS} patients created in ${ms(Date.now() - t)}`);

  const base = Date.now();
  const tokenDocs = insertedPatients.map((p, i) => {
    const f = randomPatientFactors();
    const pr = computePriority(f);
    return {
      user: p._id,
      tokenNumber: `LT-${String(i + 1).padStart(4, '0')}`,
      department: 'chronic_opd',
      status: 'in-queue',
      priorityScore: pr.score,
      priorityLevel: pr.level,
      priorityReason: pr.reason,
      priorityFactors: { age: f.age, isElderly: pr.factors.isElderly, hasCriticalCondition: pr.factors.hasCriticalCondition, conditions: f.conditions },
      chronicIllness: f.conditions[0],
      issuedAt: new Date(base + i * 1000),   // arrivals 1s apart (booking order)
    };
  });
  t = Date.now();
  await Token.insertMany(tokenDocs, { ordered: false });
  console.log(`    ${N_PATIENTS} queue tokens created in ${ms(Date.now() - t)}  ✓ queue forms`);

  // ── 3. READ + ORDER THE LIVE QUEUE (what /api/doctor/queue does) ──────
  t = Date.now();
  const active = await Token.find({ department: 'chronic_opd', status: 'in-queue' });
  const ordered = orderByPriority(active);
  console.log(`\n[3] Loaded + priority-ordered ${ordered.length} tokens in ${ms(Date.now() - t)}`);
  const mix = ordered.reduce((a, x) => (a[x.priorityLevel] = (a[x.priorityLevel] || 0) + 1, a), {});
  console.log('    priority mix:', JSON.stringify(mix));
  console.log('    first 3 served:', ordered.slice(0, 3).map((x) => `${x.tokenNumber}(${x.priorityLevel})`).join(', '));

  // ── 4. QUEUEING-THEORY CLEARANCE: 500 patients, 5 doctors ─────────────
  line();
  console.log(`\n[4] Clearing ${N_PATIENTS} patients with ${SERVING_DOCTORS} doctors @ ${AVG_CONSULT_MIN} min each\n`);

  // Discrete-event simulation, priority order, 5 pooled servers.
  const sim = (queue) => {
    const free = new Array(SERVING_DOCTORS).fill(0);  // minutes each server is next free
    let totalWait = 0, maxWait = 0;
    const waitByLevel = {};
    for (const tk of queue) {
      const s = free.indexOf(Math.min(...free));
      const start = free[s];
      const wait = start;                 // batch arrival at t=0 → wait = start time
      free[s] = start + AVG_CONSULT_MIN;
      totalWait += wait; maxWait = Math.max(maxWait, wait);
      (waitByLevel[tk.priorityLevel] ??= []).push(wait);
    }
    const makespan = Math.max(...free);
    return { makespan, avgWait: totalWait / queue.length, maxWait, waitByLevel };
  };

  const prioritised = sim(ordered);
  const fifo = sim([...active].sort((a, b) => new Date(a.issuedAt) - new Date(b.issuedAt)));

  const avgOf = (arr) => (arr && arr.length ? Math.round(arr.reduce((s, w) => s + w, 0) / arr.length) : 0);
  console.log(`    Total time to clear queue (makespan): ${hrs(prioritised.makespan)}  (${prioritised.makespan} min)`);
  console.log(`    Average patient wait:                 ${hrs(prioritised.avgWait)}`);
  console.log(`    Longest wait:                         ${hrs(prioritised.maxWait)}`);
  console.log('');
  console.log('    Avg wait by priority (WITH queueing theory / priority order):');
  console.log(`        critical: ${avgOf(prioritised.waitByLevel.critical)} min`);
  console.log(`        elderly : ${avgOf(prioritised.waitByLevel.elderly)} min`);
  console.log(`        normal  : ${avgOf(prioritised.waitByLevel.normal)} min`);
  console.log('    Same patients, plain FIFO (no priority):');
  console.log(`        critical: ${avgOf(fifo.waitByLevel.critical)} min   ← would wait this long without our algorithm`);

  // ── 5. STEADY-STATE (Erlang C) + how many doctors are actually enough ─
  line();
  const lambda = N_PATIENTS / OPD_HOURS;          // arrivals/hour during the OPD session
  const muPerServer = 60 / AVG_CONSULT_MIN;        // 6 patients/hour/doctor
  console.log(`\n[5] Queueing theory — ${N_PATIENTS} arrivals over a ${OPD_HOURS}h OPD (λ=${lambda}/h, μ=${muPerServer}/h/doctor)\n`);
  const capacity5 = SERVING_DOCTORS * muPerServer;
  console.log(`    5 doctors serve ${capacity5}/h but ${lambda}/h arrive → system is OVERLOADED.`);
  console.log(`    5 doctors physically clear ${N_PATIENTS} patients in ~${hrs(prioritised.makespan)} (≈ ${(prioritised.makespan / 60 / OPD_HOURS).toFixed(1)} OPD sessions).`);
  console.log('');
  // Minimum doctors for a stable same-day clinic (λ < sμ), then Erlang C wait.
  let need = Math.ceil(lambda / muPerServer);
  while (true) {
    const m = queueing.metrics({ lambda, muPerServer, servers: need });
    if (m && m.stable) {
      console.log(`    To clear same-session you need ≈ ${need} doctors:`);
      console.log(`        utilization ${(m.utilization * 100).toFixed(0)}%, avg wait ${m.avgWaitMin} min, P(wait) ${(m.probWait * 100).toFixed(0)}%`);
      break;
    }
    if (++need > 100) break;
  }

  // Pooling proof: 1 pooled M/M/s beats s separate M/M/1 lines.
  const enough = need;
  const pooled = queueing.metrics({ lambda, muPerServer, servers: enough });
  const siloed = queueing.metrics({ lambda: lambda / enough, muPerServer, servers: 1 });
  console.log('');
  console.log(`    Pooling proof (${enough} doctors, one shared queue vs ${enough} separate lines):`);
  console.log(`        pooled  (our app): avg wait ${pooled.avgWaitMin} min`);
  console.log(`        siloed  (per-doc): avg wait ${siloed.avgWaitMin} min  ← worse`);

  line();
  console.log(`\nDone in ${ms(Date.now() - t0)}. Cleaning up load-test DB…`);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  console.log('Load-test DB dropped. Real data untouched.\n');
}

main().catch((e) => { console.error('LOAD TEST FAILED:', e); process.exit(1); });
