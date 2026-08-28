// Doctor-module service layer — the queueing-theory / OPD-pool logic shared by
// the doctor controllers. (Kept here, not in controllers, so the module folders
// mirror the patient portal: controllers / models / routes / services.)
//
// The chronic OPD is one shared, priority-ordered queue served by all on-duty
// doctors (server pooling — the queueing-theory way to minimise waiting).

const Token = require('../../patient/models/Token');
const User = require('../../auth/models/User');
const { orderByPriority } = require('../../patient/services/priority.service');

// Average consultation length (minutes) — drives the queueing-theory waits.
const AVG_CONSULT_MIN = 10;

// ── HTTP helpers ────────────────────────────────────────────────────────────
function fail(res, status, message, code) {
  return res.status(status).json({ success: false, code: code || 'ERROR', message });
}
function io(req) { return req.app.get('io'); }

// ── small utilities ─────────────────────────────────────────────────────────
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function computeAge(dob) {
  if (!dob) return 0;
  const m = String(dob).match(/\b(19|20)\d{2}\b/);
  return m ? Math.max(new Date().getFullYear() - parseInt(m[0], 10), 0) : 0;
}

// On-duty doctors serving the pooled OPD queue right now (min 1). Drives the
// queueing-theory wait estimate.
async function onDutyDoctorCount() {
  const n = await User.countDocuments({ role: 'doctor', accountStatus: { $ne: 'suspended' } });
  return Math.max(1, n);
}

// Recompute chronic-OPD positions by priority (pooled queue).
async function recomputeOpd() {
  const active = await Token.find({ department: 'chronic_opd', status: { $in: ['in-queue', 'in-progress'] } });
  const ordered = orderByPriority(active);
  for (let i = 0; i < ordered.length; i++) { ordered[i].position = i + 1; await ordered[i].save(); }
  return ordered;
}

async function broadcast(req) {
  try { const s = io(req); if (s) s.emit('queue:update', { department: 'chronic_opd' }); } catch (e) { /* ignore */ }
}

module.exports = {
  AVG_CONSULT_MIN, fail, io, startOfToday, computeAge,
  onDutyDoctorCount, recomputeOpd, broadcast,
};
