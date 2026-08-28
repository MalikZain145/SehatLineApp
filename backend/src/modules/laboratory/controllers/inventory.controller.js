// Laboratory → inventory CRUD (consumables, reagents, equipment).

const LabInventory = require('../models/LabInventory');
const User = require('../../auth/models/User');
const { notifyUser } = require('../../patient/controllers/notification.controller');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

// Alert every lab tech when an item is at/below its minimum (or out).
async function notifyLabLowStock(m) {
  if (m.quantity > m.minimumStock) return;
  try {
    const staff = await User.find({ role: 'laboratory' }).select('_id').lean();
    const out = m.quantity <= 0;
    const title = out ? `Out of stock: ${m.name}` : `Low stock: ${m.name}`;
    const body = out
      ? `${m.name} is OUT OF STOCK (0 ${m.unit}). Please raise a requisition.`
      : `${m.name} is running low (${m.quantity} ${m.unit} left). Consider restocking.`;
    staff.forEach((s) => notifyUser(s._id, { type: 'system', title, body, icon: 'alert-circle', screen: 'Inventory' }));
  } catch (e) { /* best-effort */ }
}

function shape(m) {
  return {
    id: String(m._id),
    name: m.name,
    category: m.category,
    quantity: m.quantity,
    unit: m.unit,
    minimumStock: m.minimumStock,
    expiryDate: m.expiryDate,
    notes: m.notes,
    status: m.quantity <= 0 ? 'Out of Stock' : (m.quantity <= m.minimumStock ? 'Low Stock' : 'In Stock'),
  };
}

// GET /api/laboratory/inventory?q=&status=
async function listItems(req, res, next) {
  try {
    const filter = {};
    if (req.query.q) filter.name = { $regex: String(req.query.q).trim(), $options: 'i' };
    const rows = await LabInventory.find(filter).sort({ name: 1 }).limit(500).lean();
    let items = rows.map(shape);
    const status = req.query.status;
    if (status && status !== 'All') items = items.filter((i) => i.status === status);
    return res.json({
      success: true,
      count: items.length,
      inStock: items.filter((i) => i.status === 'In Stock').length,
      lowStock: items.filter((i) => i.status === 'Low Stock').length,
      outOfStock: items.filter((i) => i.status === 'Out of Stock').length,
      items,
    });
  } catch (err) { next(err); }
}

// POST /api/laboratory/inventory
async function addItem(req, res, next) {
  try {
    const b = req.body || {};
    if (!b.name || !String(b.name).trim()) return fail(res, 400, 'Item name is required.', 'INVALID');
    // If cartons × units/carton are given, that's the total quantity.
    const cartons = Number(b.cartons) || 0;
    const unitsPerCarton = Number(b.unitsPerCarton) || 0;
    const quantity = cartons && unitsPerCarton ? cartons * unitsPerCarton : (Number(b.quantity) || 0);
    const m = await LabInventory.create({
      name: String(b.name).trim(),
      category: b.category || 'Sample Collection',
      quantity,
      cartons,
      unitsPerCarton,
      unit: b.unit || 'pieces',
      minimumStock: Number(b.minimumStock) || 10,
      expiryDate: b.expiryDate || '',
      notes: b.notes || '',
    });
    notifyLabLowStock(m);
    return res.status(201).json({ success: true, message: 'Item added.', item: shape(m) });
  } catch (err) { next(err); }
}

// PATCH /api/laboratory/inventory/:id
async function updateItem(req, res, next) {
  try {
    const allowed = ['name', 'category', 'quantity', 'unit', 'minimumStock', 'expiryDate', 'notes'];
    const m = await LabInventory.findById(req.params.id);
    if (!m) return fail(res, 404, 'Item not found.', 'NOT_FOUND');
    for (const k of allowed) if (req.body[k] !== undefined) m[k] = req.body[k];
    await m.save();
    notifyLabLowStock(m);
    return res.json({ success: true, message: 'Item updated.', item: shape(m) });
  } catch (err) { next(err); }
}

// POST /api/laboratory/inventory/:id/stock  { add: N }  — add to stock
async function addStock(req, res, next) {
  try {
    const add = Number(req.body?.add);
    if (!Number.isFinite(add)) return fail(res, 400, 'A numeric quantity is required.', 'INVALID');
    const m = await LabInventory.findById(req.params.id);
    if (!m) return fail(res, 404, 'Item not found.', 'NOT_FOUND');
    m.quantity = Math.max(0, m.quantity + add);
    await m.save();
    return res.json({ success: true, message: 'Stock updated.', item: shape(m) });
  } catch (err) { next(err); }
}

// DELETE /api/laboratory/inventory/:id
async function deleteItem(req, res, next) {
  try {
    const r = await LabInventory.deleteOne({ _id: req.params.id });
    if (!r.deletedCount) return fail(res, 404, 'Item not found.', 'NOT_FOUND');
    return res.json({ success: true, message: 'Item removed.' });
  } catch (err) { next(err); }
}

module.exports = { listItems, addItem, updateItem, addStock, deleteItem };
