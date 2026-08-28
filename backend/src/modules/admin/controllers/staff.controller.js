// Admin → staff (pharmacists / lab) accounts + medicine requisitions.

const User = require('../../auth/models/User');
const Requisition = require('../../pharmacy/models/Requisition');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}
function emit(req, event, payload) {
  try { const io = req.app.get('io'); if (io) io.emit(event, payload || {}); } catch (e) { /* ignore */ }
}

// ── PHARMACISTS ───────────────────────────────────────────────────────────────
async function listPharmacists(req, res, next) {
  try {
    const staff = await User.find({ role: 'pharmacy' })
      .select('name email phone accountStatus createdAt').sort({ createdAt: -1 }).lean();
    return res.json({ success: true, count: staff.length, pharmacists: staff });
  } catch (err) { next(err); }
}

// Readable placeholder name from an email (ali.raza → "Ali Raza").
function nameFromEmail(email) {
  const local = String(email || '').split('@')[0] || 'Pharmacist';
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() || 'Pharmacist';
}

// Create ONE pharmacist. The admin can create an "empty" account with just an
// email (+ phone); the pharmacist fills their own name/details on first login.
async function createOnePharmacist(body) {
  const email = String(body?.email || '').trim().toLowerCase();
  if (!email) throw Object.assign(new Error('An email is required.'), { status: 400 });
  const name = String(body?.name || '').trim() || nameFromEmail(email);
  const phone = String(body?.phone || '').replace(/\s+/g, '').replace(/^0+/, '');
  const usingDefault = !String(body?.password || '').trim();
  const password = usingDefault ? 'pharmacy123' : String(body.password).trim();

  let user = await User.findOne({ email }).select('+password');
  if (user) {
    user.name = name; user.role = 'pharmacy';
    if (phone && !user.phone) user.phone = phone;
    if (body.password) { user.password = password; user.mustChangePassword = false; }
    user.isVerified = true; user.accountStatus = 'active';
    await user.save();
  } else {
    user = await User.create({
      name, email, password, role: 'pharmacy',
      phone: phone || '', isVerified: true, accountStatus: 'active',
      mustChangePassword: usingDefault, // force a change when using the shared default
    });
  }
  return { name, email, phone, password };
}

async function addPharmacist(req, res, next) {
  try {
    const created = await createOnePharmacist(req.body || {});
    logger.db('CREATE', 'User', `admin added pharmacist ${created.email}`);
    emit(req, 'admin:update', { type: 'pharmacists' });
    return res.json({ success: true, message: 'Pharmacist account ready.', pharmacist: created });
  } catch (err) {
    if (err.status) return fail(res, err.status, err.message, 'VALIDATION');
    next(err);
  }
}

// Bulk add from a JSON array: { pharmacists: [{ email, phone, name? }, ...] }
async function addPharmacistsBulk(req, res, next) {
  try {
    const list = Array.isArray(req.body?.pharmacists) ? req.body.pharmacists : [];
    if (!list.length) return fail(res, 400, 'Provide a "pharmacists" array.', 'VALIDATION');
    const created = []; const errors = [];
    for (let i = 0; i < list.length; i++) {
      try { created.push(await createOnePharmacist(list[i])); }
      catch (e) { errors.push({ row: i + 1, email: list[i]?.email, error: e.message }); }
    }
    logger.db('CREATE', 'User', `admin bulk-added ${created.length} pharmacists`);
    emit(req, 'admin:update', { type: 'pharmacists' });
    return res.json({ success: true, message: `${created.length} pharmacist(s) added.`, created, errors });
  } catch (err) { next(err); }
}

// Bulk add from an uploaded .xlsx (field "file"). Row 1 is a header; only an
// "Email" column is required — Phone/Name optional. Default password + forced
// change on first login.
async function addPharmacistsFromExcel(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) return fail(res, 400, 'Please attach an .xlsx file.', 'NO_FILE');
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const ws = wb.worksheets[0];
    if (!ws) return fail(res, 400, 'The spreadsheet has no sheets.', 'EMPTY');

    const header = {};
    ws.getRow(1).eachCell((cell, col) => { const k = String(cell.value || '').trim().toLowerCase(); if (k) header[k] = col; });
    const pick = (row, ...names) => {
      for (const n of names) { const col = header[n]; if (col) { const v = row.getCell(col).value; if (v !== null && v !== undefined && String(v).trim() !== '') return String(v.text || v).trim(); } }
      return '';
    };

    const rows = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const email = pick(row, 'email', 'login email', 'e-mail');
      if (!email) continue;
      rows.push({ email, name: pick(row, 'name', 'full name'), phone: pick(row, 'phone', 'phone number', 'mobile', 'contact'), password: pick(row, 'password') });
    }
    if (!rows.length) return fail(res, 400, 'No rows found. Make sure row 1 is a header with an "Email" column.', 'EMPTY');

    const created = []; const errors = [];
    for (let i = 0; i < rows.length; i++) {
      try { created.push(await createOnePharmacist(rows[i])); }
      catch (e) { errors.push({ row: i + 2, email: rows[i]?.email, error: e.message }); }
    }
    logger.db('CREATE', 'User', `admin imported ${created.length} pharmacists from Excel`);
    emit(req, 'admin:update', { type: 'pharmacists' });
    return res.json({ success: true, message: `${created.length} pharmacist(s) imported.`, created, errors });
  } catch (err) { next(err); }
}

async function deletePharmacist(req, res, next) {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, role: 'pharmacy' });
    if (!user) return fail(res, 404, 'Pharmacist not found.', 'NOT_FOUND');
    emit(req, 'admin:update', { type: 'pharmacists' });
    return res.json({ success: true, message: 'Pharmacist removed.' });
  } catch (err) { next(err); }
}

// ── REQUISITIONS ──────────────────────────────────────────────────────────────
async function listRequisitions(req, res, next) {
  try {
    const rows = await Requisition.find().sort({ createdAt: -1 }).limit(200).lean();
    const open = rows.filter((r) => r.status === 'open').length;
    return res.json({ success: true, open, count: rows.length, requisitions: rows });
  } catch (err) { next(err); }
}

async function fulfilRequisition(req, res, next) {
  try {
    const r = await Requisition.findByIdAndUpdate(req.params.id, { $set: { status: 'fulfilled' } }, { new: true });
    if (!r) return fail(res, 404, 'Requisition not found.', 'NOT_FOUND');
    emit(req, 'admin:update', { type: 'requisitions' });
    return res.json({ success: true, message: 'Requisition marked fulfilled.' });
  } catch (err) { next(err); }
}

module.exports = { listPharmacists, addPharmacist, addPharmacistsBulk, addPharmacistsFromExcel, deletePharmacist, listRequisitions, fulfilRequisition };
