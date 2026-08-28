// ─────────────────────────────────────────────────────────────────────────────
// SehatLine — SYSTEM DESIGN & ALGORITHMS report (PDF).
// Explains how the queue-management system works end to end: the workflow, how a
// patient's priority is decided (emergency > pregnant > elderly 50+ > normal),
// and every algorithm used (M/M/s Erlang C, Priority Queue, FCFS, Lag SIPP, and
// the adaptive service-rate measurement).
//
//   node scripts/system-report.js   →   reports/system-design.pdf
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const OUT = path.join(__dirname, '..', 'reports', 'system-design.pdf');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const TEAL = '#0BAA9D', TEAL_D = '#089082', SLATE = '#1F2937', GREY = '#64748B',
  LIGHT = '#EEF6F4', RED = '#EF4444', AMBER = '#F59E0B', BLUE = '#3B82F6', GREEN = '#10B981';

const doc = new PDFDocument({ size: 'A4', margin: 44 });
doc.pipe(fs.createWriteStream(OUT));
const M = 44, CW = doc.page.width - M * 2;

function ensure(sp) { if (doc.y + sp > doc.page.height - 50) doc.addPage(); }
function h2(t) { ensure(40); doc.moveDown(0.55); doc.x = M; doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(13).text(t, M, doc.y, { width: CW }); doc.moveDown(0.2); }
function h3(t) { ensure(28); doc.moveDown(0.2); doc.x = M; doc.fillColor(SLATE).font('Helvetica-Bold').fontSize(10.5).text(t, M, doc.y, { width: CW }); doc.moveDown(0.15); }
function para(t) { ensure(28); doc.x = M; doc.fillColor(SLATE).font('Helvetica').fontSize(9.6).text(t, M, doc.y, { width: CW }); }
function bullet(t) { ensure(16); doc.x = M; doc.fillColor(SLATE).font('Helvetica').fontSize(9.5).text('•  ' + t, M + 8, doc.y, { width: CW - 8 }); doc.moveDown(0.1); }
function small(t) { ensure(16); doc.x = M; doc.fillColor(GREY).font('Helvetica').fontSize(8.4).text(t, M, doc.y, { width: CW }); doc.moveDown(0.15); }

// Header
doc.rect(0, 0, doc.page.width, 82).fill(TEAL);
doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18).text('SehatLine — Queue System Design & Algorithms', M, 20, { width: CW });
doc.font('Helvetica').fontSize(9.5).fillColor('#EAFBF7').text('Capital Hospital, Capital Development Authority — G-6/2, Islamabad', M, 46, { width: CW });
doc.fontSize(8.5).fillColor('#EAFBF7').text(`Generated: ${new Date().toLocaleString('en-PK')}   •   How the system works, step by step`, M, 60, { width: CW });
doc.y = 100;

// ── 1. Overview ──
h2('1. What the system does');
para('SehatLine replaces the physical OPD line with a smart, priority-aware token system. A small, fixed team of doctors '
  + '(3-4 chronic, 5-8 cardiology) serves 100-400 patients a day. The system decides WHO is seen first (by medical urgency '
  + 'and age), estimates HOW LONG each patient will wait, and spreads tokens so people are not crowding the corridor — while '
  + 'measuring each doctor\'s real pace so every estimate stays accurate on its own.');

// ── 2. Workflow ──
h2('2. End-to-end workflow');
const steps = [
  ['1', 'Patient arrival', 'Patient requests a token (chronic OPD / cardiology).'],
  ['2', 'Priority assessment', 'Age + condition + vitals decide the priority class (see section 4).'],
  ['3', 'Priority + FCFS queue', 'Higher priority first; equal priority keeps first-come-first-served.'],
  ['4', 'Staff estimation (Lag SIPP)', 'How many doctors are needed for the forecast demand.'],
  ['5', 'M/M/s analysis (Erlang C)', 'Expected wait, queue length and doctor utilisation.'],
  ['6', 'Estimated wait + token', 'Patient gets a token number and a realistic "~X min" wait.'],
  ['7', 'Real-time updates', 'Position + estimate recompute live and push to every device.'],
];
steps.forEach(([n, title, desc]) => {
  ensure(30);
  const y = doc.y;
  doc.circle(M + 9, y + 9, 9).fill(TEAL);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9).text(n, M + 4, y + 4.5, { width: 12, align: 'center' });
  doc.fillColor(SLATE).font('Helvetica-Bold').fontSize(9.8).text(title, M + 26, y + 1, { width: CW - 26 });
  doc.fillColor(GREY).font('Helvetica').fontSize(8.8).text(desc, M + 26, y + 12.5, { width: CW - 26 });
  doc.y = y + 28;
});

// ── 3. Algorithms ──
h2('3. Algorithms used');

h3('a) M/M/s queueing model (Erlang C)');
para('Models the OPD as s parallel doctors serving a shared queue. Inputs: arrival rate lambda (patients/hour), service '
  + 'rate mu (patients/hour per doctor), and s doctors on duty. It computes utilisation, the chance a patient must wait, '
  + 'and the average wait and queue length.');
function formulaBox(lines) {
  ensure(14 + lines.length * 12);
  const h = 10 + lines.length * 12, y = doc.y;
  doc.roundedRect(M, y, CW, h, 5).fill(LIGHT);
  doc.fillColor(SLATE).font('Courier').fontSize(8.6);
  lines.forEach((ln, i) => doc.text(ln, M + 10, y + 6 + i * 12, { width: CW - 20 }));
  doc.y = y + h + 4;
}
formulaBox([
  'a (offered load) = lambda / mu           rho (utilisation) = a / s',
  'C = Erlang-C probability an arriving patient must wait',
  'Wq (avg wait in queue) = C / (s*mu - lambda)',
  'Lq (avg waiting) = lambda * Wq     W = Wq + 1/mu     L = lambda * W',
]);

h3('b) Priority Queue');
para('Every patient is placed in a priority class; the queue always serves the highest class first. This is what puts '
  + 'emergencies and the elderly ahead of standard patients (details in section 4).');

h3('c) FCFS (First-Come, First-Served)');
para('The tie-breaker: within the SAME priority class, patients are served in arrival order, so nobody with equal '
  + 'urgency ever jumps the line.');

h3('d) Lag SIPP staffing');
para('From forecast demand per time period, it computes the minimum doctors to keep the wait within target, with a "lag" '
  + 'shift so the busy tail of one hour stays covered by the next. This is the data-driven staffing signal (usually a 0-2 '
  + 'doctor or extended-hours tweak).');

h3('e) Adaptive service-rate measurement');
para('The system records every consultation\'s real duration (from "doctor started" to the next stage) and continuously '
  + 're-computes the average minutes-per-patient. That MEASURED pace — not a fixed guess — feeds mu, so the estimates '
  + 'self-tune as doctors speed up, slow down, or are added/removed.');

// ── 4. Priority assessment ──
h2('4. How a patient\'s priority is decided');
para('When a token is issued, the patient\'s age, condition and recent vitals are checked IN THIS ORDER — the first match '
  + 'wins. Higher score = seen sooner.');

const ladder = [
  ['Critical', RED, '1000', 'Emergency/critical condition — chest pain, breathing, stroke, cardiac, kidney, unconscious, severe, etc. Served FIRST. (+100 if also elderly.)'],
  ['High', AMBER, '700', 'Pregnant, or needs special assistance/disability.'],
  ['Elderly', TEAL, '400', 'Age 50 and above — senior citizens are placed ahead of standard patients (older seniors get a small extra bump).'],
  ['Normal', BLUE, '100', 'Standard adult patient with no urgent factor.'],
  ['Low', GREY, '50', 'Routine / non-urgent follow-ups.'],
];
ladder.forEach(([name, color, score, desc]) => {
  ensure(30);
  const y = doc.y, rowH = 28;
  doc.roundedRect(M, y, CW, rowH - 4, 5).fill('#F8FAFC');
  doc.roundedRect(M, y, 5, rowH - 4, 2).fill(color);
  doc.fillColor(color).font('Helvetica-Bold').fontSize(9.6).text(name, M + 12, y + 4, { width: 70 });
  doc.fillColor(GREY).font('Helvetica').fontSize(7.6).text(`score ${score}`, M + 12, y + 15, { width: 70 });
  doc.fillColor(SLATE).font('Helvetica').fontSize(8.7).text(desc, M + 90, y + 4, { width: CW - 98 });
  doc.y = y + rowH;
});
small('Chronic illness by itself is NOT treated as an emergency (those cases go to the ED) — only true critical conditions '
  + 'or critical recent vitals raise a patient to the Critical class. Vitals (BP, heart rate, temperature, oxygen) can push '
  + 'a patient up automatically when they are dangerous.');

// ── 5. Load division ──
h2('5. How the load auto-divides across doctors');
para('The system counts how many doctors are ON DUTY right now (the availability toggle drives this), and splits the queue '
  + 'across them:');
formulaBox([
  'doctors on duty  s  = count of active doctors',
  'estimated wait      = ceil( (position - 1) / s ) x (measured minutes per patient)',
]);
bullet('More doctors on duty -> each patient\'s "patients ahead / s" is smaller -> shorter wait.');
bullet('A doctor going off duty instantly lowers s, and every waiting patient\'s estimate recomputes.');
bullet('Off-duty doctors also disappear from patient booking, so load only goes to available doctors.');

// ── 6. Real-time + self-tuning ──
h2('6. Real-time updates & self-tuning');
para('Every token issue, "start consultation", or stage change recomputes the whole department queue in one bulk write '
  + 'and pushes the update over web-sockets, so positions and "~X min" estimates refresh live on the patient and doctor '
  + 'screens. In parallel, the measured pace refreshes every few minutes, so the same model that estimates waits also '
  + 'flags when the fixed doctors are genuinely over capacity (the "overloaded" signal for administration).');

// ── 7. Summary ──
h2('7. Summary');
para('Patient arrival -> priority assessment (emergency > pregnant > elderly 50+ > normal, FCFS within a class) -> '
  + 'Lag SIPP staffing -> M/M/s (Erlang C) wait analysis -> token with an estimated time -> live real-time updates. '
  + 'The result: emergencies and seniors are seen first, normal patients get a realistic short wait, the physical crowd is '
  + 'removed, and the system keeps itself accurate by measuring how fast the doctors actually work.');

doc.end();
console.log('System report written →', OUT);
