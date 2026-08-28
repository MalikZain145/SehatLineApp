// Admin → live SYSTEM view. Real-time operational health for the whole app:
//   • per-department queue model (M/M/s Erlang C: utilization, avg wait, load)
//   • today's throughput (tokens issued/served, appointments, dispensed)
//   • live traffic (patients in the system, logged-in sessions, doctors on duty)
//   • app health (DB, uptime, memory, load)
// Plus a JSON data export the admin can download.

const os = require('os');
const mongoose = require('mongoose');
const Token = require('../../patient/models/Token');
const Appointment = require('../../patient/models/Appointment');
const Prescription = require('../../patient/models/Prescription');
const User = require('../../auth/models/User');
const Doctor = require('../../patient/models/Doctor');
const { mmsMetrics } = require('../../patient/services/queue.engine');
const { _internals } = require('../../patient/controllers/token.controller');

const { serversFor, getServiceMin } = _internals;

const DEPARTMENTS = [
  { key: 'chronic_opd', label: 'Chronic OPD' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'laboratory', label: 'Laboratory' },
];

function localTodayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

// One department's live M/M/s (Erlang C) snapshot + counts.
async function departmentSnapshot(dept) {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const [waiting, inProgress, issuedToday] = await Promise.all([
    Token.countDocuments({ department: dept, status: 'in-queue' }),
    Token.countDocuments({ department: dept, status: 'in-progress' }),
    Token.countDocuments({ department: dept, createdAt: { $gte: startOfDay } }),
  ]);
  const s = Math.max(1, await serversFor(dept));
  const serviceMin = await getServiceMin(dept);
  const hoursElapsed = Math.max(0.5, (Date.now() - startOfDay.getTime()) / 3600000);
  const lambda = issuedToday / hoursElapsed;       // arrivals / hour
  const mu = 60 / serviceMin;                       // patients / hour per server
  const m = mmsMetrics(lambda, mu, s);
  return {
    servers: s,
    avgServiceMin: serviceMin,
    waiting,
    inProgress,
    arrivalsPerHour: Math.round(lambda * 10) / 10,
    utilization: isFinite(m.rho) ? Math.round(m.rho * 100) : 100,   // %
    avgWaitMin: isFinite(m.Wq) ? Math.round(m.Wq) : null,
    expectedInQueue: isFinite(m.Lq) ? Math.round(m.Lq) : null,
    overloaded: !m.stable,
  };
}

// GET /api/admin/system/metrics
async function getMetrics(req, res, next) {
  try {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const todayStr = localTodayStr();

    const [deps, tokensToday, completedToday, appointmentsToday, dispensedToday, activeInSystem, doctorsOnDuty, totalDoctors, totalPatients] = await Promise.all([
      Promise.all(DEPARTMENTS.map((d) => departmentSnapshot(d.key))),
      Token.countDocuments({ createdAt: { $gte: startOfDay } }),
      Token.countDocuments({ status: 'completed', completedAt: { $gte: startOfDay } }),
      Appointment.countDocuments({ date: todayStr }),
      Prescription.countDocuments({ pharmacyStatus: 'dispensed', dispensedAt: { $gte: startOfDay } }),
      Token.countDocuments({ status: { $in: ['in-queue', 'in-progress', 'pharmacy', 'laboratory'] } }),
      User.countDocuments({ role: 'doctor', onDuty: { $ne: false } }),
      Doctor.countDocuments({ active: true }),
      User.countDocuments({ role: 'patient' }),
    ]);

    const departments = deps.map((d, i) => ({ department: DEPARTMENTS[i].key, label: DEPARTMENTS[i].label, ...d }));
    const mem = process.memoryUsage();
    const overloaded = departments.filter((d) => d.overloaded).map((d) => d.label);

    return res.json({
      success: true,
      health: {
        status: mongoose.connection.readyState === 1 ? (overloaded.length ? 'busy' : 'healthy') : 'degraded',
        dbConnected: mongoose.connection.readyState === 1,
        uptimeSec: Math.round(process.uptime()),
        memoryMB: Math.round(mem.rss / 1048576),
        heapUsedMB: Math.round(mem.heapUsed / 1048576),
        loadAvg: os.loadavg().map((n) => Math.round(n * 100) / 100),
        node: process.version,
        serverTime: new Date().toISOString(),
        overloadedDepartments: overloaded,
      },
      traffic: { activeInSystem, doctorsOnDuty, totalDoctors, totalPatients },
      throughput: { tokensToday, completedToday, appointmentsToday, dispensedToday },
      departments,
      algorithm: {
        model: 'M/M/s (Erlang C) + non-preemptive priority + FCFS',
        priorityLadder: ['Critical (1000)', 'High/Follow-up (700)', 'Elderly 50+ (400)', 'Normal (100)', 'Low (50)'],
        note: 'Utilization, average wait and expected queue length are computed live per department from the measured doctor pace.',
      },
    });
  } catch (err) { next(err); }
}

// GET /api/admin/system/export  — a professionally FORMATTED EXCEL backup of the
// day's system data (Summary + Doctors + Patients + today's Appointments /
// Prescriptions / Tokens), same style as the pharmacy backup.
async function exportData(req, res, next) {
  try {
    const { buildWorkbook } = require('../services/backup.service');
    const { workbook } = await buildWorkbook(req.query.date, { name: req.user.name, email: req.user.email });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="sehatline-backup-${localTodayStr()}.xlsx"`);
    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) { next(err); }
}

// ── SYSTEM CACHE ───────────────────────────────────────────────────────────
// "System cache" = accumulated cruft that is 100% safe to remove: ended/expired
// login sessions, already-read old notifications, and expired password-reset
// tickets. It grows over time; when it crosses a critical threshold the admin
// is nudged (in red) to clear it. Clearing NEVER touches active users' data.
const logger = require('../../../utils/logger');
const CACHE_CRITICAL_ITEMS = Number(process.env.CACHE_CRITICAL_ITEMS || 200);
const AVG_ITEM_KB = 0.7; // rough per-record estimate for a human-readable size

async function cacheCounts() {
  const Session = require('../../auth/models/Session');
  const Notification = require('../../patient/models/Notification');
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const [inactiveSessions, oldReadNotifs] = await Promise.all([
    Session.countDocuments({ isActive: false }),
    Notification.countDocuments({ read: true, createdAt: { $lt: weekAgo } }),
  ]);
  let expiredResets = 0;
  try {
    const PasswordReset = require('../../auth/models/PasswordReset');
    expiredResets = await PasswordReset.countDocuments({ expiresAt: { $lt: new Date() } });
  } catch (e) { /* model optional */ }
  return { inactiveSessions, oldReadNotifs, expiredResets, weekAgo };
}

// GET /api/admin/system/cache
async function getCache(req, res, next) {
  try {
    const { inactiveSessions, oldReadNotifs, expiredResets } = await cacheCounts();
    const itemCount = inactiveSessions + oldReadNotifs + expiredResets;
    const sizeMB = Math.round((itemCount * AVG_ITEM_KB / 1024) * 100) / 100;
    const pct = Math.min(100, Math.round((itemCount / CACHE_CRITICAL_ITEMS) * 100));
    const critical = itemCount >= CACHE_CRITICAL_ITEMS;
    return res.json({
      success: true,
      cache: {
        itemCount, sizeMB, threshold: CACHE_CRITICAL_ITEMS, critical, pct,
        breakdown: { inactiveSessions, oldReadNotifs, expiredResets },
        memoryRssMB: Math.round(process.memoryUsage().rss / 1048576),
      },
    });
  } catch (err) { next(err); }
}

// POST /api/admin/system/cache/clear
async function clearCache(req, res, next) {
  try {
    const Session = require('../../auth/models/Session');
    const Notification = require('../../patient/models/Notification');
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const [s, n] = await Promise.all([
      Session.deleteMany({ isActive: false }),
      Notification.deleteMany({ read: true, createdAt: { $lt: weekAgo } }),
    ]);
    let resetDeleted = 0;
    try {
      const PasswordReset = require('../../auth/models/PasswordReset');
      const r = await PasswordReset.deleteMany({ expiresAt: { $lt: new Date() } });
      resetDeleted = r.deletedCount || 0;
    } catch (e) { /* optional */ }
    try { if (global.gc) global.gc(); } catch (e) { /* gc not exposed */ }

    const freed = (s.deletedCount || 0) + (n.deletedCount || 0) + resetDeleted;
    const freedMB = Math.round((freed * AVG_ITEM_KB / 1024) * 100) / 100;
    logger.db('DELETE', 'Cache', `admin ${req.user?.email} cleared ${freed} cached items`);
    try { const io = req.app.get('io'); if (io) io.emit('admin:update', { type: 'cache' }); } catch (e) { /* ignore */ }
    return res.json({ success: true, message: `System optimized — ${freed} cached item(s) removed.`, freed, freedMB, optimized: true });
  } catch (err) { next(err); }
}

// ── SYSTEM RESTART ─────────────────────────────────────────────────────────
// POST /api/admin/system/restart — restart the backend process without the
// admin touching a terminal. Works whether the server runs under nodemon
// (`npm run dev`), a process manager like pm2, or plain `node server.js`.
function performRestart() {
  const fs = require('fs');
  const path = require('path');
  const { spawn } = require('child_process');
  const cwd = process.cwd();
  const serverFile = path.join(cwd, 'server.js');

  const respawnDetached = () => {
    try {
      // Wait for this process to release the port, then start a fresh server.
      // Windows requires stdio:'ignore' for a detached child to outlive us.
      const waiter = `setTimeout(function(){require('child_process').spawn(process.execPath,['server.js'],{cwd:${JSON.stringify(cwd)},stdio:'ignore',detached:true,windowsHide:true}).unref();},1500)`;
      spawn(process.execPath, ['-e', waiter], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    } catch (e) { /* best effort */ }
  };

  // 1) Supervised (npm run start:managed) → exit with the restart code and the
  //    supervisor relaunches us. Most reliable, cross-platform, keeps logs.
  if (process.env.SEHATLINE_SUPERVISED === '1') { process.exit(42); return; }

  // 2) pm2 → a clean exit makes the manager restart us.
  if (process.env.pm_id !== undefined) { process.exit(0); return; }

  // 3) nodemon (npm run dev) → touching a watched file triggers a restart.
  //    Safety net: if nodemon hasn't killed us in 3s, respawn ourselves.
  const viaNodemon = process.env.npm_lifecycle_event === 'dev';
  try {
    if (viaNodemon && fs.existsSync(serverFile)) {
      const now = new Date();
      fs.utimesSync(serverFile, now, now);
      setTimeout(() => { respawnDetached(); process.exit(0); }, 3000);
      return;
    }
  } catch (e) { /* fall through */ }

  // 4) plain `node server.js` → best-effort detached respawn, then exit. Less
  //    reliable on Windows; prefer `npm run start:managed`.
  respawnDetached();
  setTimeout(() => process.exit(0), 300);
}

async function restartSystem(req, res, next) {
  try {
    logger.warn(`⚠️  System restart requested by admin ${req.user?.email}`);
    // Ask connected clients to reload once the backend is back.
    try { const io = req.app.get('io'); if (io) io.emit('system:restart', { at: Date.now() }); } catch (e) { /* ignore */ }
    res.json({ success: true, message: 'System is restarting…' });
    setTimeout(() => performRestart(), 600);
  } catch (err) { next(err); }
}

module.exports = { getMetrics, exportData, getCache, clearCache, restartSystem };
