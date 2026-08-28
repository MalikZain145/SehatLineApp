// Medicine Donation Bank controller.
//
// Donate surplus in-date medicine, browse what others have donated (search by
// name/city), and claim an item — which shares your contact with the donor so
// you can arrange a handover. Mirrors the Blood Donor Network flow.

const MedicineDonation = require('../models/MedicineDonation');
const { notifyUser } = require('./notification.controller');
const logger = require('../../../utils/logger');

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}
function io(req) { return req.app.get('io'); }

// Expire donations whose expiry month has passed (lazy, at read time).
async function expireStale() {
  const nowMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  await MedicineDonation.updateMany(
    { status: 'available', expiry: { $ne: '', $lt: nowMonth } },
    { $set: { status: 'expired' } }
  );
}

// POST /api/patient/medicine-bank
async function createDonation(req, res, next) {
  try {
    const { medicineName, form, quantity, expiry, city, contactPhone, notes, sealed } = req.body || {};
    if (!medicineName || !medicineName.trim()) return fail(res, 400, 'Medicine name is required.', 'NO_NAME');
    if (!city || !city.trim()) return fail(res, 400, 'City is required.', 'NO_CITY');
    if (!contactPhone || !contactPhone.trim()) return fail(res, 400, 'A contact phone is required.', 'NO_PHONE');

    // If an expiry is given, it must be in the future (in-date medicine only).
    if (expiry && expiry < new Date().toISOString().slice(0, 7)) {
      return fail(res, 400, 'This medicine has expired and cannot be donated.', 'EXPIRED');
    }

    const donation = await MedicineDonation.create({
      donor: req.user._id,
      medicineName: medicineName.trim(),
      form: (form || '').trim(),
      quantity: (quantity || '').trim(),
      expiry: (expiry || '').trim(),
      city: city.trim(),
      contactPhone: contactPhone.trim(),
      notes: (notes || '').trim(),
      sealed: sealed !== false,
      status: 'available',
    });

    logger.db('INSERT', 'MedicineDonation', `${req.user.email} donated ${medicineName} (${city})`);
    const server = io(req);
    if (server) server.emit('medbank:update', { type: 'new' });

    return res.status(201).json({ success: true, message: 'Thank you! Your medicine is now listed for someone who needs it.', donation });
  } catch (err) { next(err); }
}

// GET /api/patient/medicine-bank?q=&city=
async function listDonations(req, res, next) {
  try {
    await expireStale();
    const filter = { status: 'available' };
    if (req.query.q) filter.medicineName = { $regex: String(req.query.q).trim(), $options: 'i' };
    if (req.query.city) filter.city = { $regex: String(req.query.city).trim(), $options: 'i' };

    const donations = await MedicineDonation.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    const mapped = donations.map((d) => ({
      _id: d._id,
      medicineName: d.medicineName,
      form: d.form,
      quantity: d.quantity,
      expiry: d.expiry,
      city: d.city,
      notes: d.notes,
      sealed: d.sealed,
      contactPhone: d.contactPhone,
      isMine: String(d.donor) === String(req.user._id),
      createdAt: d.createdAt,
    }));
    return res.json({ success: true, donations: mapped });
  } catch (err) { next(err); }
}

// GET /api/patient/medicine-bank/mine
async function myDonations(req, res, next) {
  try {
    await expireStale();
    const donations = await MedicineDonation.find({ donor: req.user._id }).sort({ createdAt: -1 });
    return res.json({ success: true, donations });
  } catch (err) { next(err); }
}

// POST /api/patient/medicine-bank/:id/claim
async function claimDonation(req, res, next) {
  try {
    const donation = await MedicineDonation.findById(req.params.id);
    if (!donation) return fail(res, 404, 'Donation not found', 'NOT_FOUND');
    if (donation.status !== 'available') return fail(res, 400, 'This medicine is no longer available.', 'NOT_AVAILABLE');
    if (String(donation.donor) === String(req.user._id)) return fail(res, 400, 'You cannot claim your own donation.', 'OWN');
    if (!req.user.phone) return fail(res, 400, 'Add your phone number in your profile before claiming.', 'NO_PHONE');

    donation.status = 'claimed';
    donation.claimedBy = { user: req.user._id, name: req.user.name, phone: req.user.phone, at: new Date() };
    await donation.save();

    // Tell the donor who claimed it, with contact so they can coordinate.
    await notifyUser(donation.donor, {
      type: 'system',
      title: 'Your donated medicine was claimed',
      body: `${req.user.name} needs your ${donation.medicineName}. Contact: ${req.user.phone}`,
      icon: 'medkit',
      screen: 'MedicineBankScreen',
    });

    const server = io(req);
    if (server) server.emit('medbank:update', { type: 'claimed' });

    return res.json({
      success: true,
      message: 'Claimed! The donor has been notified. Their contact number is shown so you can arrange collection.',
      contactPhone: donation.contactPhone,
    });
  } catch (err) { next(err); }
}

// POST /api/patient/medicine-bank/:id/given  (donor marks it handed over)
async function markGiven(req, res, next) {
  try {
    const donation = await MedicineDonation.findOne({ _id: req.params.id, donor: req.user._id });
    if (!donation) return fail(res, 404, 'Donation not found', 'NOT_FOUND');
    donation.status = 'given';
    await donation.save();
    return res.json({ success: true, message: 'Marked as given. Thank you for helping someone in need.', donation });
  } catch (err) { next(err); }
}

// POST /api/patient/medicine-bank/:id/remove
async function removeDonation(req, res, next) {
  try {
    const donation = await MedicineDonation.findOne({ _id: req.params.id, donor: req.user._id });
    if (!donation) return fail(res, 404, 'Donation not found', 'NOT_FOUND');
    donation.status = 'removed';
    await donation.save();
    return res.json({ success: true, message: 'Listing removed.' });
  } catch (err) { next(err); }
}

// GET /api/patient/medicine-bank/stats  (Home tile)
async function getStats(req, res, next) {
  try {
    await expireStale();
    const [available, myActive, given] = await Promise.all([
      MedicineDonation.countDocuments({ status: 'available' }),
      MedicineDonation.countDocuments({ donor: req.user._id, status: 'available' }),
      MedicineDonation.countDocuments({ status: 'given' }),
    ]);
    return res.json({ success: true, stats: { available, myActive, given } });
  } catch (err) { next(err); }
}

module.exports = {
  createDonation, listDonations, myDonations, claimDonation, markGiven, removeDonation, getStats,
};
