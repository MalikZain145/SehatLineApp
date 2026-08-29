// Prints the ENTIRE database to the terminal, table by table, with the total
// number of tables (collections).
//   Run:  npm run db-print       (from the backend/ folder)
//   or:   node scripts/db-print.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const env = require('../src/config/env');

// Register every Mongoose model so all collections show up.
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (p.replace(/\\/g, '/').includes('/models/') && f.endsWith('.js')) {
      try { require(p); } catch (e) { /* skip */ }
    }
  }
})(path.join(__dirname, '..', 'src'));

// Compact, terminal-friendly value formatting.
function fmt(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean' || typeof v === 'number') return v;
  if (v instanceof Date) return new Date(v).toISOString().slice(0, 19).replace('T', ' ');
  if (Array.isArray(v)) return v.length ? `[${v.length}] ` + v.map(fmt).join('; ') : '[]';
  if (typeof v === 'object') {
    if (v.toHexString) return String(v);           // ObjectId
    return JSON.stringify(v);
  }
  let s = String(v);
  if (/^\$2[aby]\$/.test(s)) return '[hashed]';      // bcrypt password
  if (s.length > 80 && /^(data:|[A-Za-z0-9+/=]{80,})/.test(s)) return `[binary ${Math.round(s.length / 1024)}KB]`;
  return s.length > 34 ? s.slice(0, 31) + '...' : s; // keep columns readable
}

(async () => {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
  const names = Object.keys(mongoose.models).sort();

  console.log('\n============================================================');
  console.log(`  SEHATLINE DATABASE  —  ${mongoose.connection.name}`);
  console.log(`  TOTAL TABLES (collections): ${names.length}`);
  console.log('============================================================');

  let i = 0;
  let totalDocs = 0;
  for (const n of names) {
    i += 1;
    const docs = await mongoose.models[n].find({}).lean();
    totalDocs += docs.length;
    console.log(`\n------------------------------------------------------------`);
    console.log(`TABLE ${i}/${names.length}:  ${n}   (${docs.length} record${docs.length === 1 ? '' : 's'})`);
    console.log(`------------------------------------------------------------`);
    if (!docs.length) { console.log('(no records)'); continue; }
    const rows = docs.map((d) => {
      const o = {};
      for (const k of Object.keys(d)) { if (k === '__v') continue; o[k] = fmt(d[k]); }
      return o;
    });
    console.table(rows);
  }

  console.log('\n============================================================');
  console.log(`  DONE.  TOTAL TABLES: ${names.length}   ·   TOTAL RECORDS: ${totalDocs}`);
  console.log('============================================================\n');
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error('DB print failed:', e.message); process.exit(1); });
