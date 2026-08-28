// Pharmacy backup → professionally formatted Excel of dispensed prescriptions.
// The patient token journey spans Doctor → Pharmacy → (future) Lab, so each row
// records who prescribed, which card/token, which medicines were given, and when.
// • Daily file written automatically at 2 PM (hospital close) + on demand.
// • A single day can be downloaded, or "Export All" builds one master workbook
//   with one sheet per day.

const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const Prescription = require('../../patient/models/Prescription');
const logger = require('../../../utils/logger');

const BACKUP_DIR = path.join(__dirname, '..', '..', '..', '..', 'backups', 'pharmacy');

const TEAL = 'FF0BAA9D';
const TEAL_DARK = 'FF089082';
const SLATE = 'FF1F2937';
const WHITE = 'FFFFFFFF';
const ZEBRA = 'FFF2FCF9';

function ensureDir() { fs.mkdirSync(BACKUP_DIR, { recursive: true }); }
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function prettyDate(d) {
  return d.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function dayBounds(day) {
  const start = new Date(day); start.setHours(0, 0, 0, 0);
  const end = new Date(day); end.setHours(23, 59, 59, 999);
  return { start, end };
}

const COLS = [
  { header: '#', key: 'sr', width: 6 },
  { header: 'Token / Card No', key: 'card', width: 18 },
  { header: 'Patient Name', key: 'patient', width: 24 },
  { header: 'CNIC', key: 'cnic', width: 18 },
  { header: 'Doctor', key: 'doctor', width: 22 },
  { header: 'Specialization', key: 'spec', width: 18 },
  { header: 'Chronic Illness', key: 'illness', width: 18 },
  { header: 'Medicines Dispensed', key: 'medicines', width: 46 },
  { header: 'Lab Tests', key: 'tests', width: 22 },
  { header: 'Counter', key: 'counter', width: 9 },
  { header: 'Dispensed At', key: 'time', width: 14 },
];
const NCOLS = COLS.length;

function bandCell(ws, rowIdx, text, { size = 11, bold = true, fill = TEAL, color = WHITE, height = 20 } = {}) {
  ws.mergeCells(rowIdx, 1, rowIdx, NCOLS);
  const cell = ws.getCell(rowIdx, 1);
  cell.value = text;
  cell.font = { bold, size, color: { argb: color } };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  ws.getRow(rowIdx).height = height;
}

// Build one worksheet for a given day from its dispensed rows.
function writeDaySheet(ws, day, rows, pharmacist) {
  ws.columns = COLS.map((c) => ({ key: c.key, width: c.width }));

  bandCell(ws, 1, 'Capital Hospital', { size: 16, fill: TEAL_DARK, height: 26 });
  bandCell(ws, 2, 'Capital Development Authority — G-6/2, Islamabad', { size: 11, fill: TEAL_DARK });
  bandCell(ws, 3, `Pharmacy Dispensing Record — ${prettyDate(day)}`, { size: 12, fill: TEAL });
  bandCell(ws, 4, `Generated: ${new Date().toLocaleString('en-PK')}    •    Total patients dispensed: ${rows.length}    •    Data backed up by: Sehat Line`, { size: 10, fill: TEAL });
  const p = pharmacist || {};
  const who = [p.name, p.phone, p.email, p.employeeId].filter(Boolean).join('  ·  ') || '—';
  bandCell(ws, 5, `Downloaded by: ${who}`, { size: 10, fill: SLATE, color: WHITE });

  ws.addRow([]); // row 6 spacer

  // Header (row 7)
  const headerRow = ws.getRow(7);
  COLS.forEach((c, i) => { headerRow.getCell(i + 1).value = c.header; });
  headerRow.font = { bold: true, color: { argb: WHITE } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
    cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
  });

  rows.forEach((pr, idx) => {
    const r = ws.addRow([
      idx + 1,
      pr.patient?.cdaCard || pr.patient?.cnic || pr.tokenNumber || '—',
      pr.patient?.name || '—',
      pr.patient?.cnic || '—',
      pr.doctor?.name || '—',
      pr.doctor?.specialization || '—',
      pr.chronicIllness || '—',
      (pr.medicines || []).join('; ') || '—',
      (pr.tests || []).join('; ') || '—',
      pr.pharmacyCounter || '—',
      pr.dispensedAt ? new Date(pr.dispensedAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—',
    ]);
    r.alignment = { vertical: 'top', wrapText: true };
    if (idx % 2 === 1) r.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }; });
    r.eachCell((c) => { c.border = { top: { style: 'hair', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } }, left: { style: 'hair', color: { argb: 'FFE2E8F0' } }, right: { style: 'hair', color: { argb: 'FFE2E8F0' } } }; });
  });

  if (rows.length === 0) {
    ws.mergeCells(8, 1, 8, NCOLS);
    const c = ws.getCell(8, 1);
    c.value = 'No medicines were dispensed on this day.';
    c.alignment = { horizontal: 'center' };
    c.font = { italic: true, color: { argb: 'FF64748B' } };
  }
  ws.views = [{ state: 'frozen', ySplit: 7 }];
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1 };
}

async function rowsForDay(day) {
  const { start, end } = dayBounds(day);
  return Prescription.find({ pharmacyStatus: 'dispensed', dispensedAt: { $gte: start, $lte: end } })
    .sort({ dispensedAt: 1 }).lean();
}

// Distinct days that have dispensed data (newest first) with counts.
async function listDays() {
  const agg = await Prescription.aggregate([
    { $match: { pharmacyStatus: 'dispensed', dispensedAt: { $ne: null } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$dispensedAt', timezone: 'Asia/Karachi' } }, count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);
  return agg.map((d) => ({ date: d._id, count: d.count }));
}

// A single-day workbook (returns { workbook, count }).
async function buildWorkbookForDay(dateArg, pharmacist) {
  const day = dateArg ? new Date(dateArg) : new Date();
  const rows = await rowsForDay(day);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SehatLine Pharmacy';
  wb.created = new Date();
  writeDaySheet(wb.addWorksheet(ymd(day)), day, rows, pharmacist);
  return { workbook: wb, count: rows.length, day };
}

// Master workbook: one sheet per active day.
async function buildMasterWorkbook(pharmacist) {
  const days = await listDays();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SehatLine Pharmacy';
  wb.created = new Date();
  if (days.length === 0) {
    writeDaySheet(wb.addWorksheet('No Data'), new Date(), [], pharmacist);
    return { workbook: wb, sheets: 0 };
  }
  for (const d of days) {
    const day = new Date(`${d.date}T00:00:00`);
    // eslint-disable-next-line no-await-in-loop
    const rows = await rowsForDay(day);
    writeDaySheet(wb.addWorksheet(d.date), day, rows, pharmacist);
  }
  return { workbook: wb, sheets: days.length };
}

// Cron/manual: build + save today's (or given day) file to disk.
async function generateDailyBackup(dateArg, pharmacist) {
  ensureDir();
  const { workbook, count, day } = await buildWorkbookForDay(dateArg, pharmacist);
  const fileName = `pharmacy-backup-${ymd(day)}.xlsx`;
  const filePath = path.join(BACKUP_DIR, fileName);
  await workbook.xlsx.writeFile(filePath);
  logger.db('BACKUP', 'Pharmacy', `${fileName} (${count} rows)`);
  return { filePath, fileName, count };
}

module.exports = {
  generateDailyBackup, buildWorkbookForDay, buildMasterWorkbook, listDays, BACKUP_DIR,
};
