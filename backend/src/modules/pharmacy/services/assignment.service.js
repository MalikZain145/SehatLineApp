// Pharmacist load-balancer.
//
// When a doctor finishes a patient, the prescription is handed to the pharmacy.
// Instead of dumping every prescription into one shared pile, we spread them
// across the pharmacists who are actually on duty right now, giving each new
// prescription to whoever currently has the fewest active ones. That keeps the
// physical counter rush even and stops one pharmacist drowning while another
// sits idle.
//
// "On duty right now" = role pharmacy, onDuty !== false, and seen within
// PRESENCE_WINDOW_MS (they polled their queue/dashboard recently). If nobody is
// online, the prescription is left unassigned (pharmacist.id = null) so the
// first pharmacist who logs in picks it up.

const User = require('../../auth/models/User');
const Prescription = require('../../patient/models/Prescription');

const PRESENCE_WINDOW_MS = 5 * 60 * 1000; // considered "online" if seen in 5 min
const ACTIVE = ['pending', 'preparing', 'ready'];

// Mark a pharmacist as present (called from their live-queue / dashboard polls).
async function touchPharmacist(userId) {
  try { await User.updateOne({ _id: userId }, { $set: { lastSeenAt: new Date() } }); } catch (e) { /* best-effort */ }
}

// Ids of pharmacists who are on duty AND online right now.
async function getAvailablePharmacistIds() {
  const since = new Date(Date.now() - PRESENCE_WINDOW_MS);
  const rows = await User.find({
    role: 'pharmacy',
    onDuty: { $ne: false },
    lastSeenAt: { $gte: since },
  }).select('_id').lean();
  return rows.map((r) => r._id);
}

// Pick the least-loaded available pharmacist. Returns { id, name } or null when
// nobody is online (→ leave the prescription unassigned).
async function pickPharmacist() {
  const since = new Date(Date.now() - PRESENCE_WINDOW_MS);
  const available = await User.find({
    role: 'pharmacy',
    onDuty: { $ne: false },
    lastSeenAt: { $gte: since },
  }).select('_id name').lean();
  if (!available.length) return null;

  // Current active load per pharmacist (their pending/preparing/ready count).
  const loads = await Promise.all(
    available.map((p) => Prescription.countDocuments({ 'pharmacist.id': p._id, pharmacyStatus: { $in: ACTIVE } })),
  );

  let best = 0;
  for (let i = 1; i < available.length; i++) {
    if (loads[i] < loads[best]) best = i;
  }
  const chosen = available[best];
  return { id: chosen._id, name: chosen.name || 'Pharmacist' };
}

// Build a Mongo filter for "prescriptions this pharmacist should see": the ones
// assigned to them, plus anything unassigned or assigned to a pharmacist who is
// NOT currently online (so no prescription is ever stranded). Admins bypass this.
async function visibleToPharmacistFilter(userId) {
  const availableIds = await getAvailablePharmacistIds();
  return {
    $or: [
      { 'pharmacist.id': userId },
      { 'pharmacist.id': null },
      { 'pharmacist.id': { $nin: availableIds } },
    ],
  };
}

module.exports = {
  touchPharmacist,
  getAvailablePharmacistIds,
  pickPharmacist,
  visibleToPharmacistFilter,
  PRESENCE_WINDOW_MS,
};
