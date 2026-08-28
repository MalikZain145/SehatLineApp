// Node client for the Python priority ML service, with a rule-based fallback.
//
// The Python service (ml-service/) ranks patients with a trained
// GradientBoosting + neural-net ensemble. This client calls it, but if the
// service is unreachable it falls back to the local rule-based scorer
// (priority.service.js) so booking NEVER breaks — the app just degrades to
// the transparent rules.

const env = require('../config/env');
const { computePriority } = require('../modules/patient/services/priority.service');

const ML_URL = env.mlServiceUrl || 'http://127.0.0.1:8000';
const TIMEOUT_MS = 1500;

async function callMl(path, body) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${ML_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`ML ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// Build the ML feature payload from a user + their latest vitals reading.
function buildPatient({ user = {}, vital = null, extra = {} }) {
  const age = computeAge(user.dob) || Number(extra.age) || 0;
  const conditions = extra.conditions || user.chronicConditions || [];
  return {
    id: String(user._id || extra.id || ''),
    age,
    conditions,
    systolic: vital?.systolic ?? 0,
    diastolic: vital?.diastolic ?? 0,
    heartRate: vital?.heartRate ?? 0,
    spo2: vital?.spo2 ?? 0,
    bloodSugar: vital?.bloodSugar ?? 0,
    temperature: vital?.temperature ?? 0,
    isPregnant: !!(user.isPregnant || extra.isPregnant),
    hasDisability: !!(user.hasDisability || extra.disability),
    daysSinceLastVisit: Number(extra.daysSinceLastVisit) || 0,
    missedAppointments: Number(extra.missedAppointments) || 0,
  };
}

// Score ONE patient. Returns { score, level, source }.
async function scorePatient(patient) {
  try {
    const r = await callMl('/score', patient);
    return { score: r.priorityScore, level: r.priorityLevel, source: 'ml' };
  } catch (e) {
    const p = computePriority({
      age: patient.age,
      conditions: patient.conditions,
      isPregnant: patient.isPregnant,
      disability: patient.hasDisability,
    });
    // Rule score is on a 0-1000-ish scale; normalise to 0-100 to stay
    // comparable with the ML output.
    const score = Math.min(100, Math.round(p.score / 10));
    return { score, level: p.level, source: 'rule-fallback' };
  }
}

// Rank a BATCH of patients (the booking-rush case). Returns the service's
// ranked array, or a locally-sorted fallback.
async function rankPatients(patients) {
  try {
    const r = await callMl('/prioritize', { patients });
    return { ranked: r.ranked, source: r.engine || 'ml' };
  } catch (e) {
    const scored = patients.map((p) => {
      const pr = computePriority({ age: p.age, conditions: p.conditions, isPregnant: p.isPregnant, disability: p.hasDisability });
      return { id: p.id, priorityScore: Math.min(100, Math.round(pr.score / 10)), priorityLevel: pr.level };
    });
    scored.sort((a, b) => b.priorityScore - a.priorityScore);
    scored.forEach((s, i) => { s.rank = i + 1; });
    return { ranked: scored, source: 'rule-fallback' };
  }
}

function computeAge(dob) {
  if (!dob) return 0;
  const m = String(dob).match(/\b(19|20)\d{2}\b/);
  return m ? Math.max(new Date().getFullYear() - parseInt(m[0], 10), 0) : 0;
}

module.exports = { scorePatient, rankPatients, buildPatient, ML_URL };
