// Generates docs/SehatLine_Database.pdf — every collection's SCHEMA
// (fields/types/required/enums/refs/defaults) AND all existing DATA, in tables.
//   Run:  node scripts/schema-dump.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const env = require('../src/config/env');

// ---- register every model ----
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

const TEAL = '#0B8A7D', HDR = '#0F766E', SLATE = '#1F2937', GREY = '#6B7280', ZEBRA = '#F3FAF8';

function schemaRows(model) {
  const rows = [];
  const paths = model.schema.paths;
  for (const name of Object.keys(paths)) {
    if (name === '__v') continue;
    const st = paths[name];
    let type = st.instance || 'Mixed';
    let ref = (st.options && st.options.ref) || (st.caster && st.caster.options && st.caster.options.ref) || '';
    if (type === 'Array') {
      const ct = st.caster && st.caster.instance ? st.caster.instance : 'Mixed';
      type = `[${ct}]`;
    }
    const req = st.isRequired ? 'yes' : '';
    let enums = '';
    if (st.enumValues && st.enumValues.length) enums = st.enumValues.join(', ');
    else if (st.options && st.options.enum) enums = [].concat(st.options.enum.values || st.options.enum).join(', ');
    let def = '';
    if (st.options && st.options.default !== undefined && st.options.default !== null) {
      def = typeof st.options.default === 'function' ? '(auto)' : String(st.options.default);
    }
    const notes = [ref ? `ref → ${ref}` : '', enums ? `enum: ${enums}` : '', def !== '' ? `default: ${def}` : '']
      .filter(Boolean).join('  |  ');
    rows.push([name, type, req, notes]);
  }
  return rows;
}

function fmt(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  if (v instanceof Date) return new Date(v).toISOString().slice(0, 19).replace('T', ' ');
  if (Array.isArray(v)) return v.length ? `[${v.length}] ` + v.map(fmt).join('; ') : '[]';
  if (typeof v === 'object') {
    if (v._bsontype === 'ObjectID' || (v.toHexString)) return String(v);
    return JSON.stringify(v);
  }
  let s = String(v);
  // Collapse huge base64 / long blobs
  if (s.length > 80 && /^(data:|[A-Za-z0-9+/=]{80,})/.test(s)) return `[binary ${Math.round(s.length / 1024)} KB]`;
  if (/^\$2[aby]\$/.test(s)) return '[hashed]'; // bcrypt password
  return s;
}

function main() {
  const outDir = path.join(__dirname, '..', '..', 'docs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const OUT = path.join(outDir, 'SehatLine_Database.pdf');

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30, bufferPages: true });
  const stream = fs.createWriteStream(OUT);
  doc.pipe(stream);
  const M = 30;
  const PW = doc.page.width, PH = doc.page.height, CW = PW - M * 2;

  function ensure(h) { if (doc.y + h > PH - 34) doc.addPage(); }
  function h1(t) { doc.addPage(); doc.fillColor(HDR).font('Helvetica-Bold').fontSize(20).text(t, M, M); doc.moveDown(0.4); }
  function h2(t) { ensure(40); doc.moveDown(0.3); doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(13).text(t, M, doc.y); doc.moveDown(0.2); }
  function para(t, o = {}) { ensure(20); doc.fillColor(o.color || SLATE).font(o.font || 'Helvetica').fontSize(o.size || 9).text(t, M, doc.y, { width: CW }); doc.moveDown(0.2); }

  // Generic table: headers[], rows[][], colWidths[]; wraps to new pages; zebra rows.
  function table(headers, rows, widths, opt = {}) {
    const fs0 = opt.fontSize || 7.5;
    const padX = 3, padY = 3;
    const rowH = (cells) => {
      let max = 1;
      cells.forEach((c, i) => {
        doc.font('Helvetica').fontSize(fs0);
        const h = doc.heightOfString(String(c || ''), { width: widths[i] - padX * 2 });
        max = Math.max(max, h);
      });
      return max + padY * 2;
    };
    const drawRow = (cells, y, { header, zebra } = {}) => {
      let x = M;
      const h = header ? (fs0 + padY * 2 + 4) : rowH(cells);
      if (zebra) doc.rect(M, y, widths.reduce((a, b) => a + b, 0), h).fill(ZEBRA);
      cells.forEach((c, i) => {
        doc.rect(x, y, widths[i], h).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
        doc.fillColor(header ? '#FFFFFF' : SLATE).font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(fs0)
          .text(String(c == null ? '' : c), x + padX, y + padY, { width: widths[i] - padX * 2, height: h - padY, ellipsis: true });
        x += widths[i];
      });
      return h;
    };
    const headerH = fs0 + padY * 2 + 4;
    const drawHeader = () => {
      let x = M;
      doc.rect(M, doc.y, widths.reduce((a, b) => a + b, 0), headerH).fill(HDR);
      headers.forEach((hh, i) => { doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(fs0).text(String(hh), x + padX, doc.y + padY, { width: widths[i] - padX * 2, ellipsis: true }); x += widths[i]; });
      doc.y += headerH;
    };
    if (doc.y + headerH + 20 > PH - 30) doc.addPage();
    drawHeader();
    rows.forEach((r, ri) => {
      const h = rowH(r);
      if (doc.y + h > PH - 30) { doc.addPage(); drawHeader(); }
      drawRow(r, doc.y, { zebra: ri % 2 === 0 });
      doc.y += h;
    });
    doc.moveDown(0.6);
  }

  // Wide data table: split columns into groups that fit CW; each group repeats a key column.
  function dataTable(headers, rows, keyIdx) {
    // per-column width by content, capped
    const w = headers.map((hh, i) => {
      let m = String(hh).length;
      for (const r of rows) m = Math.max(m, String(r[i] == null ? '' : r[i]).length);
      return Math.min(150, Math.max(46, m * 4.4));
    });
    // build groups
    const groups = [];
    let cur = [], curW = 0;
    const keyW = w[keyIdx];
    for (let i = 0; i < headers.length; i++) {
      if (i === keyIdx) continue;
      if (curW + keyW + w[i] > CW && cur.length) { groups.push(cur); cur = []; curW = 0; }
      cur.push(i); curW += w[i];
    }
    if (cur.length) groups.push(cur);
    if (!groups.length) groups.push([]);
    groups.forEach((g, gi) => {
      const idx = [keyIdx, ...g];
      const hh = idx.map((i) => headers[i]);
      const ww = idx.map((i) => w[i]);
      const rr = rows.map((r) => idx.map((i) => r[i]));
      if (groups.length > 1) para(`columns ${gi + 1}/${groups.length}`, { color: GREY, size: 7.5 });
      table(hh, rr, ww, { fontSize: 7 });
    });
  }

  // ---------- COVER ----------
  doc.fillColor(HDR).font('Helvetica-Bold').fontSize(30).text('SehatLine', M, 120);
  doc.fillColor(SLATE).fontSize(18).text('Database Schema & Data Dictionary', M, 160);
  doc.fillColor(GREY).font('Helvetica').fontSize(11)
    .text('MongoDB (Mongoose) — every collection: fields, types, constraints, and all stored records.', M, 190, { width: CW });

  return { doc, para, h1, h2, table, dataTable, OUT, stream };
}

(async () => {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
  const ctx = main();
  const { doc, para, h1, h2, table, dataTable, OUT, stream } = ctx;

  const names = Object.keys(mongoose.models).sort();

  // Summary
  doc.fillColor(GREY).fontSize(10).text(`Database: ${mongoose.connection.name}   ·   Collections: ${names.length}   ·   Generated: ${new Date().toLocaleString()}`, 30, 220, { width: doc.page.width - 60 });
  h1('Summary of Collections');
  const summary = [];
  const counts = {};
  for (const n of names) {
    const c = await mongoose.models[n].countDocuments();
    counts[n] = c;
    summary.push([n, mongoose.models[n].collection.name, String(Object.keys(mongoose.models[n].schema.paths).length - 1), String(c)]);
  }
  table(['Model', 'Collection', 'Fields', 'Documents'], summary, [180, 200, 90, 100], { fontSize: 9 });

  // Part A — Schema
  h1('Part A — Schema (Tables & Columns)');
  for (const n of names) {
    h2(`${n}   (collection: ${mongoose.models[n].collection.name},  ${counts[n]} documents)`);
    table(['Field', 'Type', 'Required', 'Constraints / Reference / Default'],
      schemaRows(mongoose.models[n]), [150, 90, 60, 452], { fontSize: 8 });
  }

  // Part B — Data
  h1('Part B — Data (All Records)');
  for (const n of names) {
    const model = mongoose.models[n];
    const docs = await model.find({}).lean();
    h2(`${n}   —   ${docs.length} record(s)`);
    if (!docs.length) { para('(no records)', { color: GREY, size: 9 }); continue; }
    // columns = schema field order (present) + any extra keys
    const fields = Object.keys(model.schema.paths).filter((f) => f !== '__v');
    const cols = fields.slice();
    const headers = cols;
    const rows = docs.map((d) => cols.map((c) => fmt(d[c])));
    const keyIdx = Math.max(0, cols.indexOf('_id'));
    dataTable(headers, rows, keyIdx);
  }

  // page numbers
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.fillColor('#6B7280').font('Helvetica').fontSize(8)
      .text(`SehatLine — Database Schema & Data   ·   Page ${i + 1} of ${range.count}`, 30, doc.page.height - 22, { width: doc.page.width - 60, align: 'center' });
  }

  doc.end();
  // Wait for the WRITE STREAM to finish flushing to disk (not just doc 'end').
  await new Promise((resolve, reject) => { stream.on('finish', resolve); stream.on('error', reject); });
  await mongoose.disconnect();
  console.log('WROTE', OUT);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
