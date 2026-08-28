// Admin daily backup → a professionally formatted Excel workbook of the whole
// system's data, styled like the pharmacy backup (hospital header band, teal
// headers, zebra rows). One workbook, one sheet per data set:
//   Summary · Doctors · Patients · Appointments (today) · Prescriptions (today) · Tokens (today)

const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const User = require('../../auth/models/User');
const Doctor = require('../../patient/models/Doctor');
const Appointment = require('../../patient/models/Appointment');
const Prescription = require('../../patient/models/Prescription');
const Token = require('../../patient/models/Token');
const logger = require('../../../utils/logger');

const BACKUP_DIR = path.join(__dirname, '..', '..', '..', '..', 'backups', 'admin');
const TEAL = 'FF0BAA9D';
const TEAL_DARK = 'FF089082';
const SLATE = 'FF1F2937';
const WHITE = 'FFFFFFFF';
const ZEBRA = 'FFF2FCF9';

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

function band(ws, rowIdx, ncols, text, { size = 11, fill = TEAL, color = WHITE, height = 20 } = {}) {
  ws.mergeCells(rowIdx, 1, rowIdx, ncols);
  const cell = ws.getCell(rowIdx, 1);
  cell.value = text;
  cell.font = { bold: true, size, color: { argb: color } };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  ws.getRow(rowIdx).height = height;
}

// Write a titled, styled table into a sheet. `cols`=[{header,width}], `rows`=array-of-arrays.
function writeSheet(ws, title, day, admin, cols, rows) {
  const ncols = cols.length;
  ws.columns = cols.map((c) => ({ width: c.width }));
  band(ws, 1, ncols, 'Capital Hospital', { size: 16, fill: TEAL_DARK, height: 26 });
  band(ws, 2, ncols, 'Capital Development Authority — G-6/2, Islamabad', { size: 11, fill: TEAL_DARK });
  band(ws, 3, ncols, `${title} — ${prettyDate(day)}`, { size: 12, fill: TEAL });
  band(ws, 4, ncols, `Generated: ${new Date().toLocaleString('en-PK')}    •    Records: ${rows.length}    •    Data backed up by: Sehat Line`, { size: 10, fill: TEAL });
  band(ws, 5, ncols, `Downloaded by: ${admin?.name || 'Administrator'}${admin?.email ? '  ·  ' + admin.email : ''}`, { size: 10, fill: SLATE });
  ws.addRow([]);

  const headerRow = ws.getRow(7);
  cols.forEach((c, i) => { headerRow.getCell(i + 1).value = c.header; });
  headerRow.font = { bold: true, color: { argb: WHITE } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 22;
  headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } }; });

  rows.forEach((r, idx) => {
    const row = ws.addRow(r);
    row.alignment = { vertical: 'top', wrapText: true };
    if (idx % 2 === 1) row.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }; });
  });
  if (!rows.length) {
    ws.mergeCells(8, 1, 8, ncols);
    const c = ws.getCell(8, 1);
    c.value = 'No records.'; c.alignment = { horizontal: 'center' }; c.font = { italic: true, color: { argb: 'FF64748B' } };
  }
  ws.views = [{ state: 'frozen', ySplit: 7 }];
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1 };
}

async function buildWorkbook(dateArg, admin) {
  const day = dateArg ? new Date(dateArg) : new Date();
  const { start, end } = dayBounds(day);
  const todayStr = ymd(day);

  const [doctors, patients, appts, prescriptions, tokens] = await Promise.all([
    Doctor.find().lean(),
    User.find({ role: 'patient' }).select('name email cnic phone cdaCard isChronic accountStatus createdAt').lean(),
    Appointment.find({ date: todayStr }).sort({ time: 1 }).lean(),
    Prescription.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: 1 }).lean(),
    Token.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: 1 }).lean(),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SehatLine Admin';
  wb.created = new Date();

  // Summary
  writeSheet(wb.addWorksheet('Summary'), 'System Backup Summary', day, admin,
    [{ header: 'Metric', width: 34 }, { header: 'Value', width: 18 }],
    [
      ['Total Doctors', doctors.length],
      ['Active Doctors', doctors.filter((d) => d.active !== false).length],
      ['Total Patients', patients.length],
      ['Chronic Patients', patients.filter((p) => p.isChronic).length],
      ["Today's Appointments", appts.length],
      ["Today's Prescriptions", prescriptions.length],
      ["Today's Tokens", tokens.length],
      ['Dispensed Today', prescriptions.filter((p) => p.pharmacyStatus === 'dispensed').length],
    ]);

  // Doctors
  writeSheet(wb.addWorksheet('Doctors'), 'Doctors', day, admin,
    [{ header: '#', width: 5 }, { header: 'Name', width: 24 }, { header: 'Specialization', width: 22 }, { header: 'Department', width: 16 }, { header: 'Room', width: 10 }, { header: 'Experience', width: 11 }, { header: 'Active', width: 9 }],
    doctors.map((d, i) => [i + 1, d.name || '—', d.specialization || '—', d.department || '—', d.room || '—', d.experienceYears || 0, d.active !== false ? 'Yes' : 'No']));

  // Patients
  writeSheet(wb.addWorksheet('Patients'), 'Patients', day, admin,
    [{ header: '#', width: 5 }, { header: 'Name', width: 24 }, { header: 'CNIC', width: 18 }, { header: 'Phone', width: 15 }, { header: 'CDA Card', width: 16 }, { header: 'Chronic', width: 9 }, { header: 'Status', width: 12 }],
    patients.map((p, i) => [i + 1, p.name || '—', p.cnic || '—', p.phone || '—', p.cdaCard || '—', p.isChronic ? 'Yes' : 'No', p.accountStatus || 'active']));

  // Appointments (today)
  writeSheet(wb.addWorksheet('Appointments'), "Today's Appointments", day, admin,
    [{ header: '#', width: 5 }, { header: 'Time', width: 10 }, { header: 'Doctor', width: 22 }, { header: 'Reason', width: 22 }, { header: 'Priority', width: 12 }, { header: 'Status', width: 12 }],
    appts.map((a, i) => [i + 1, a.time || '—', a.doctorName || '—', a.reason || '—', a.priorityLevel || 'normal', a.status || '—']));

  // Prescriptions (today)
  writeSheet(wb.addWorksheet('Prescriptions'), "Today's Prescriptions", day, admin,
    [{ header: '#', width: 5 }, { header: 'Token', width: 12 }, { header: 'Patient', width: 22 }, { header: 'Doctor', width: 20 }, { header: 'Medicines', width: 40 }, { header: 'Tests', width: 22 }, { header: 'Pharmacy', width: 12 }],
    prescriptions.map((p, i) => [i + 1, p.tokenNumber || '—', p.patient?.name || '—', p.doctor?.name || '—', (p.medicines || []).join('; ') || '—', (p.tests || []).join('; ') || '—', p.pharmacyStatus || '—']));

  // Tokens (today)
  writeSheet(wb.addWorksheet('Tokens'), "Today's Tokens", day, admin,
    [{ header: '#', width: 5 }, { header: 'Token', width: 12 }, { header: 'Department', width: 16 }, { header: 'Illness', width: 20 }, { header: 'Priority', width: 12 }, { header: 'Status', width: 14 }],
    tokens.map((t, i) => [i + 1, t.tokenNumber || '—', t.department || '—', t.chronicIllness || '—', t.priorityLevel || 'normal', t.status || '—']));

  return { workbook: wb, day, counts: { doctors: doctors.length, patients: patients.length, appts: appts.length, prescriptions: prescriptions.length, tokens: tokens.length } };
}

// Cron/manual: save today's workbook to disk.
async function generateDailyBackup(dateArg, admin) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const { workbook, day, counts } = await buildWorkbook(dateArg, admin);
  const fileName = `sehatline-backup-${ymd(day)}.xlsx`;
  const filePath = path.join(BACKUP_DIR, fileName);
  await workbook.xlsx.writeFile(filePath);
  logger.db('BACKUP', 'Admin', `${fileName}`);
  return { filePath, fileName, counts };
}

module.exports = { buildWorkbook, generateDailyBackup, BACKUP_DIR };
