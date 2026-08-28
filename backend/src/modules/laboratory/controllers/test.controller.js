// Laboratory → test catalog CRUD.

const LabTest = require('../models/LabTest');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}

// GET /api/laboratory/tests?q=&category=
async function listTests(req, res, next) {
  try {
    const filter = {};
    if (req.query.q) filter.name = { $regex: String(req.query.q).trim(), $options: 'i' };
    if (req.query.category && req.query.category !== 'All') filter.category = req.query.category;
    const rows = await LabTest.find(filter).sort({ name: 1 }).limit(500).lean();
    const tests = rows.map((t) => ({
      id: String(t._id),
      name: t.name,
      code: t.code,
      category: t.category,
      sampleType: t.sampleType,
      price: t.price,
      turnaroundHours: t.turnaroundHours,
      description: t.description,
      parameters: t.parameters || [],
      active: t.active,
    }));
    return res.json({ success: true, count: tests.length, tests });
  } catch (err) { next(err); }
}

async function getTest(req, res, next) {
  try {
    const t = await LabTest.findById(req.params.id).lean();
    if (!t) return fail(res, 404, 'Test not found.', 'NOT_FOUND');
    return res.json({ success: true, test: { id: String(t._id), ...t } });
  } catch (err) { next(err); }
}

// POST /api/laboratory/tests
async function addTest(req, res, next) {
  try {
    const b = req.body || {};
    if (!b.name || !String(b.name).trim()) return fail(res, 400, 'Test name is required.', 'INVALID');
    const t = await LabTest.create({
      name: String(b.name).trim(),
      code: b.code || '',
      category: b.category || 'Hematology',
      sampleType: b.sampleType || 'Blood',
      price: Number(b.price) || 0,
      turnaroundHours: Number(b.turnaroundHours) || 24,
      description: b.description || '',
      parameters: Array.isArray(b.parameters) ? b.parameters : [],
      active: b.active !== false,
    });
    return res.status(201).json({ success: true, message: 'Test added.', test: { id: String(t._id), ...t.toObject() } });
  } catch (err) { next(err); }
}

// PATCH /api/laboratory/tests/:id
async function updateTest(req, res, next) {
  try {
    const allowed = ['name', 'code', 'category', 'sampleType', 'price', 'turnaroundHours', 'description', 'parameters', 'active'];
    const t = await LabTest.findById(req.params.id);
    if (!t) return fail(res, 404, 'Test not found.', 'NOT_FOUND');
    for (const k of allowed) if (req.body[k] !== undefined) t[k] = req.body[k];
    await t.save();
    return res.json({ success: true, message: 'Test updated.', test: { id: String(t._id), ...t.toObject() } });
  } catch (err) { next(err); }
}

// DELETE /api/laboratory/tests/:id
async function deleteTest(req, res, next) {
  try {
    const r = await LabTest.deleteOne({ _id: req.params.id });
    if (!r.deletedCount) return fail(res, 404, 'Test not found.', 'NOT_FOUND');
    return res.json({ success: true, message: 'Test removed.' });
  } catch (err) { next(err); }
}

module.exports = { listTests, getTest, addTest, updateTest, deleteTest };
