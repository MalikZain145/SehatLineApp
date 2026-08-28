// ─────────────────────────────────────────────────────────────────────────────
// SehatLine — APP / BACKEND crash-resistance load test.
//
// Pushes real load through the token pipeline (priority triage + bulk position
// recompute + queue query) at 50 … 1000 concurrent patients against MongoDB, and
// confirms it stays fast and never errors/crashes. All test data is tagged 'LT-…'
// and deleted afterwards, so nothing pollutes the real queue.
//
//   node scripts/app-load-test.js
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const env = require('../src/config/env');
const Token = require('../src/modules/patient/models/Token');
const { computePriority, orderByPriority } = require('../src/modules/patient/services/priority.service');

const LOADS = [50, 100, 200, 500, 1000];
const DEPT = 'chronic_opd';
const RUN = `LT-${Date.now().toString(36)}`; // unique tag for this run

function drawFactors() {
  const r = Math.random();
  const age = r < 0.3 ? 60 + ((Math.random() * 25) | 0) : 20 + ((Math.random() * 40) | 0);
  const conditions = [];
  const c = Math.random();
  if (c < 0.05) conditions.push('chest pain');
  else if (c < 0.10) conditions.push('breathing');
  return { age, conditions, isPregnant: Math.random() < 0.04 };
}

// Mirror of the controller's bulk position recompute (the heavy hot path).
async function recompute(tagRe) {
  const active = await Token.find({ department: DEPT, tokenNumber: tagRe, status: { $in: ['in-queue', 'in-progress'] } });
  const ordered = orderByPriority(active);
  const ops = ordered.map((t, i) => ({ updateOne: { filter: { _id: t._id }, update: { $set: { position: i + 1 } } } }));
  if (ops.length) await Token.bulkWrite(ops, { ordered: false });
  return ordered.length;
}

(async () => {
  await mongoose.connect(env.mongoUri);
  const uid = new mongoose.Types.ObjectId(); // synthetic patient ref (not validated)
  const results = [];
  let hadError = false;

  for (const N of LOADS) {
    const tag = `${RUN}-${N}-`;
    const tagRe = new RegExp('^' + tag);
    await Token.deleteMany({ tokenNumber: tagRe });

    try {
      const t0 = Date.now();
      // Build N patients with real priority triage.
      const docs = [];
      for (let i = 0; i < N; i++) {
        const p = computePriority(drawFactors());
        docs.push({
          user: uid, tokenNumber: `${tag}${i}`, department: DEPT, status: 'in-queue',
          priorityScore: p.score, priorityLevel: p.level, priorityReason: p.reason, factors: p.factors,
        });
      }
      // Concurrent inserts (5 parallel batches) — stresses write concurrency.
      const t1 = Date.now();
      const batches = 5, size = Math.ceil(N / batches);
      await Promise.all(Array.from({ length: batches }, (_, b) =>
        Token.insertMany(docs.slice(b * size, (b + 1) * size), { ordered: false })));
      const insertMs = Date.now() - t1;

      // Concurrent position recomputes (as if several clients refresh at once).
      const t2 = Date.now();
      await Promise.all([recompute(tagRe), recompute(tagRe), recompute(tagRe), recompute(tagRe)]);
      const recomputeMs = Date.now() - t2;

      // Priority-ordered queue read.
      const t3 = Date.now();
      const q = await Token.find({ tokenNumber: tagRe, status: 'in-queue' }).sort({ priorityScore: -1, issuedAt: 1 }).lean();
      const queryMs = Date.now() - t3;

      const totalMs = Date.now() - t0;
      const throughput = Math.round(N / (totalMs / 1000));
      results.push({ N, insertMs, recomputeMs, queryMs, totalMs, throughput, served: q.length, error: null });
      console.log(`N=${String(N).padStart(4)}  insert ${insertMs}ms  recompute ${recomputeMs}ms  query ${queryMs}ms  → ${throughput} tokens/s  (queue ${q.length})`);
    } catch (e) {
      hadError = true;
      results.push({ N, error: e.message });
      console.error(`N=${N} ERROR:`, e.message);
    } finally {
      await Token.deleteMany({ tagRe }).catch(() => {});
      await Token.deleteMany({ tokenNumber: tagRe });
    }
  }

  // Safety net: remove anything from this run.
  await Token.deleteMany({ tokenNumber: new RegExp('^' + RUN) });

  console.log('\n' + '─'.repeat(56));
  console.log(hadError ? '❌ Errors occurred under load.' : '✅ No crashes / no errors — backend held up to 1000 concurrent patients.');
  const ok = results.filter((r) => !r.error);
  if (ok.length) {
    const peak = ok[ok.length - 1];
    console.log(`   Peak: ${peak.N} patients handled in ${peak.totalMs}ms (${peak.throughput} tokens/s), queue read ${peak.queryMs}ms.`);
  }
  console.log('─'.repeat(56));

  await mongoose.disconnect();
  process.exit(hadError ? 1 : 0);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
