// Laboratory backup → professionally formatted Excel of the day's completed lab
// reports. Written automatically at 2 PM (hospital close) every day EXCEPT
// Sunday, and on demand. Mirrors the pharmacy backup.

const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const LabReport = require('../../patient/models/LabReport');
const logger = require('../../../utils/logger');

const BACKUP_DIR = path.join(__dirname, '..', '..', '..', '..', 'backups', 'laboratory');

const TEAL = 'FF0BAA9D';
const TEAL_DARK = 'FF089082';
const SLATE = 'FF1F2937';
const WHITE = 'FFFFFFFF';
const ZEBRA = 'FFF2FCF9';

function ensureDir() { fs.mkdirSync(BACKUP_DIR, { recursive: true }); }
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function prettyDate(d) { return d.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
function dayBounds(day) {
  const start = new Date(day); start.setHours(0, 0, 0, 0);
  const end = new Date(day); end.setHours(23, 59, 59, 999);
  return { start, end };
}

const COLS = [
  { header: '#', key: 'sr', width: 6 },
  { header: 'Report No', key: 'report', width: 14 },
  { header: 'Card / MRN', key: 'card', width: 16 },
  { header: 'Patient Name', key: 'patient', width: 24 },
  { header: 'Test', key: 'test', width: 34 },
  { header: 'Category', key: 'category', width: 16 },
  { header: 'Referred By', key: 'doctor', width: 22 },
  { header: 'Results', key: 'results', width: 9 },
  { header: 'Reported At', key: 'time', width: 16 },
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

function writeDaySheet(ws, day, rows, staff) {
  ws.columns = COLS.map((c) => ({ key: c.key, width: c.width }));
  bandCell(ws, 1, 'Capital Hospital', { size: 16, fill: TEAL_DARK, height: 26 });
  bandCell(ws, 2, 'Capital Development Authority — G-6/2, Islamabad', { size: 11, fill: TEAL_DARK });
  bandCell(ws, 3, `Laboratory Report Record — ${prettyDate(day)}`, { size: 12, fill: TEAL });
  bandCell(ws, 4, `Generated: ${new Date().toLocaleString('en-PK')}    •    Total reports: ${rows.length}    •    Data backed up by: Sehat Line`, { size: 10, fill: TEAL });
  const p = staff || {};
  const who = [p.name, p.phone, p.email, p.employeeId].filter(Boolean).join('  ·  ') || '—';
  bandCell(ws, 5, `Downloaded by: ${who}`, { size: 10, fill: SLATE, color: WHITE });

  ws.addRow([]);
  const headerRow = ws.getRow(7);
  COLS.forEach((c, i) => { headerRow.getCell(i + 1).value = c.header; });
  headerRow.font = { bold: true, color: { argb: WHITE } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
    cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
  });

  rows.forEach((rep, idx) => {
    const r = ws.addRow([
      idx + 1,
      rep.reportNumber || '—',
      rep.patient?.mrn || rep.patient?.cnic || '—',
      rep.patient?.name || '—',
      rep.title || '—',
      rep.category || '—',
      rep.referredBy || '—',
      (rep.results || []).length,
      rep.reportedAt ? new Date(rep.reportedAt).toLocaleString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—',
    ]);
    r.alignment = { vertical: 'top', wrapText: true };
    if (idx % 2 === 1) r.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }; });
    r.eachCell((c) => { c.border = { top: { style: 'hair', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } }, left: { style: 'hair', color: { argb: 'FFE2E8F0' } }, right: { style: 'hair', color: { argb: 'FFE2E8F0' } } }; });
  });

  if (rows.length === 0) {
    ws.mergeCells(8, 1, 8, NCOLS);
    const c = ws.getCell(8, 1);
    c.value = 'No lab reports were issued on this day.';
    c.alignment = { horizontal: 'center' };
    c.font = { italic: true, color: { argb: 'FF64748B' } };
  }
  ws.views = [{ state: 'frozen', ySplit: 7 }];
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1 };
}

async function rowsForDay(day) {
  const { start, end } = dayBounds(day);
  return LabReport.find({ reportedAt: { $gte: start, $lte: end } }).sort({ reportedAt: 1 }).lean();
}

async function listDays() {
  const agg = await LabReport.aggregate([
    { $match: { reportedAt: { $ne: null } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$reportedAt', timezone: 'Asia/Karachi' } }, count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);
  return agg.map((d) => ({ date: d._id, count: d.count }));
}

async function buildWorkbookForDay(dateArg, staff) {
  const day = dateArg ? new Date(dateArg) : new Date();
  const rows = await rowsForDay(day);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SehatLine Laboratory';
  wb.created = new Date();
  writeDaySheet(wb.addWorksheet(ymd(day)), day, rows, staff);
  return { workbook: wb, count: rows.length, day };
}

async function buildMasterWorkbook(staff) {
  const days = await listDays();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SehatLine Laboratory';
  wb.created = new Date();
  if (days.length === 0) { writeDaySheet(wb.addWorksheet('No Data'), new Date(), [], staff); return { workbook: wb, sheets: 0 }; }
  for (const d of days) {
    const day = new Date(`${d.date}T00:00:00`);
    // eslint-disable-next-line no-await-in-loop
    const rows = await rowsForDay(day);
    writeDaySheet(wb.addWorksheet(d.date), day, rows, staff);
  }
  return { workbook: wb, sheets: days.length };
}

async function generateDailyBackup(dateArg, staff) {
  ensureDir();
  const { workbook, count, day } = await buildWorkbookForDay(dateArg, staff);
  const fileName = `laboratory-backup-${ymd(day)}.xlsx`;
  const filePath = path.join(BACKUP_DIR, fileName);
  await workbook.xlsx.writeFile(filePath);
  logger.db('BACKUP', 'Laboratory', `${fileName} (${count} rows)`);
  return { filePath, fileName, count };
}

module.exports = { generateDailyBackup, buildWorkbookForDay, buildMasterWorkbook, listDays, BACKUP_DIR };
