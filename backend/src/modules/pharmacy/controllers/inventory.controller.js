// Pharmacy → Inventory. List (search + filter), add, edit, delete medicines.

const Medicine = require('../models/Medicine');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}
function emit(req, event, payload) {
  try { const io = req.app.get('io'); if (io) io.emit(event, payload || {}); } catch (e) { /* ignore */ }
}
function shape(m) {
  const obj = m.toObject ? m.toObject() : m;
  const status = obj.stock <= 0 ? 'Out of Stock' : (obj.stock <= obj.minimumStock ? 'Low Stock' : 'In Stock');
  return { ...obj, id: String(obj._id), status };
}

// GET /api/pharmacy/inventory?q=&status=
async function listMedicines(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const filter = {};
    if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { genericName: new RegExp(q, 'i') }, { category: new RegExp(q, 'i') }];
    const rows = await Medicine.find(filter).sort({ name: 1 }).limit(1000);
    let medicines = rows.map(shape);

    const status = String(req.query.status || '').trim();
    if (status && status !== 'All') medicines = medicines.filter((m) => m.status === status);

    const counts = {
      inStock: medicines.filter((m) => m.status === 'In Stock').length,
      lowStock: medicines.filter((m) => m.status === 'Low Stock').length,
      outOfStock: medicines.filter((m) => m.status === 'Out of Stock').length,
      total: medicines.length,
    };
    return res.json({ success: true, counts, count: medicines.length, medicines });
  } catch (err) { next(err); }
}

// Escape a string so it can be used as a literal in a RegExp.
function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

async function addMedicine(req, res, next) {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return fail(res, 400, 'Medicine name is required.', 'VALIDATION');
    // Brand names must be unique (case-insensitive). Same FORMULA under a
    // different brand name is fine — only the exact name is blocked.
    const dup = await Medicine.findOne({ name: new RegExp(`^${escapeRe(name)}$`, 'i') });
    if (dup) return fail(res, 409, `A medicine named "${name}" already exists. Use a different name (same formula under another brand is fine).`, 'DUPLICATE_NAME');
    const med = await Medicine.create({
      name,
      genericName: req.body.genericName || '',
      category: req.body.category || 'Tablet',
      department: req.body.department || 'General',
      strength: req.body.strength || '',
      stock: Number(req.body.stock) || 0,
      minimumStock: Number(req.body.minimumStock) || 10,
      expiry: req.body.expiry || '',
      batchNumber: req.body.batchNumber || '',
      manufacturer: req.body.manufacturer || '',
      description: req.body.description || '',
    });
    logger.db('CREATE', 'Medicine', `${name} (+${med.stock})`);
    emit(req, 'pharmacy:update', { type: 'inventory' });
    return res.json({ success: true, message: 'Medicine added.', medicine: shape(med) });
  } catch (err) { next(err); }
}

async function updateMedicine(req, res, next) {
  try {
    const med = await Medicine.findById(req.params.id);
    if (!med) return fail(res, 404, 'Medicine not found.', 'NOT_FOUND');
    // If the name is being changed, it must not collide with another medicine.
    if (req.body.name !== undefined) {
      const newName = String(req.body.name).trim();
      const dup = await Medicine.findOne({ _id: { $ne: med._id }, name: new RegExp(`^${escapeRe(newName)}$`, 'i') });
      if (dup) return fail(res, 409, `Another medicine named "${newName}" already exists.`, 'DUPLICATE_NAME');
    }
    const fields = ['name', 'genericName', 'category', 'department', 'strength', 'stock', 'minimumStock', 'expiry', 'batchNumber', 'manufacturer', 'description'];
    fields.forEach((k) => {
      if (req.body[k] === undefined) return;
      med[k] = (k === 'stock' || k === 'minimumStock') ? Number(req.body[k]) || 0 : req.body[k];
    });
    await med.save();
    emit(req, 'pharmacy:update', { type: 'inventory' });
    return res.json({ success: true, message: 'Medicine updated.', medicine: shape(med) });
  } catch (err) { next(err); }
}

async function deleteMedicine(req, res, next) {
  try {
    const med = await Medicine.findByIdAndDelete(req.params.id);
    if (!med) return fail(res, 404, 'Medicine not found.', 'NOT_FOUND');
    emit(req, 'pharmacy:update', { type: 'inventory' });
    return res.json({ success: true, message: 'Medicine removed.' });
  } catch (err) { next(err); }
}

module.exports = { listMedicines, addMedicine, updateMedicine, deleteMedicine, shape };
