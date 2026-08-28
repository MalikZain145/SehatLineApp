// Doctor → Awareness Camps. Any doctor (chronic OR OPD/department) can run
// their own free awareness/screening camp. Created camps appear to patients in
// the "Awareness Camps" tab automatically (the patient list shows every active,
// upcoming camp regardless of who created it).

const HealthCamp = require('../../patient/models/HealthCamp');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}
function bump(req) {
  try { const io = req.app.get('io'); if (io) io.emit('camp:update', { type: 'created' }); } catch (e) { /* ignore */ }
}

// POST /api/doctor/camps
async function createCamp(req, res, next) {
  try {
    const b = req.body || {};
    const title = String(b.title || '').trim();
    const date = String(b.date || '').trim(); // 'YYYY-MM-DD'
    if (!title) return fail(res, 400, 'A camp title is required.', 'VALIDATION');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(res, 400, 'A valid date (YYYY-MM-DD) is required.', 'VALIDATION');

    const category = HealthCamp.CATEGORIES.includes(b.category) ? b.category : 'General';

    const camp = await HealthCamp.create({
      title,
      category,
      description: String(b.description || '').trim(),
      date,
      startTime: String(b.startTime || '09:00'),
      endTime: String(b.endTime || '13:00'),
      venue: String(b.venue || 'Capital Hospital, G-6/2').trim(),
      city: String(b.city || 'Islamabad').trim(),
      organizer: String(b.organizer || req.user.name || 'Doctor').trim(),
      free: b.free !== false,
      capacity: Number(b.capacity) || 0,
      active: true,
      createdBy: req.user._id,
      createdByName: req.user.name || '',
      createdByRole: 'doctor',
    });

    logger.db('CREATE', 'HealthCamp', `${req.user.email} → "${title}" on ${date}`);
    bump(req);
    return res.json({ success: true, message: 'Awareness camp published.', camp });
  } catch (err) { next(err); }
}

// GET /api/doctor/camps — camps this doctor created (newest first).
async function listMyCamps(req, res, next) {
  try {
    const camps = await HealthCamp.find({ createdBy: req.user._id }).sort({ date: 1 }).lean();
    return res.json({
      success: true,
      count: camps.length,
      camps: camps.map((c) => ({
        id: String(c._id),
        title: c.title, category: c.category, description: c.description,
        date: c.date, startTime: c.startTime, endTime: c.endTime,
        venue: c.venue, city: c.city, organizer: c.organizer,
        capacity: c.capacity, active: c.active,
        registrants: (c.registrants || []).length,
      })),
    });
  } catch (err) { next(err); }
}

// DELETE /api/doctor/camps/:id — remove a camp this doctor created.
async function deleteCamp(req, res, next) {
  try {
    const camp = await HealthCamp.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!camp) return fail(res, 404, 'Camp not found (or not yours).', 'NOT_FOUND');
    bump(req);
    return res.json({ success: true, message: 'Camp removed.' });
  } catch (err) { next(err); }
}

module.exports = { createCamp, listMyCamps, deleteCamp };
