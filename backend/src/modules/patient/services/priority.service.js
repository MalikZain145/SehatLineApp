// Priority service.
//
// Decides how soon a patient's token is served. Your rule:
//   • Elderly patients get priority over normal patients.
//   • Patients with a critical condition (heart, etc.) get priority even
//     ABOVE normal elderly patients.
//
// This is a transparent, rule-based scorer. It is structured so the trained
// ML model (sehatline_priority.keras) can replace/augment it later — see
// ml.service.js. Until the model's exact 21 input features are wired, these
// rules give correct, explainable behaviour.

// Conditions considered critical (served first). Extend as needed.
const CRITICAL_CONDITIONS = [
  'heart', 'cardiac', 'cardio', 'chest pain', 'stroke', 'breathing',
  'respiratory', 'kidney', 'renal', 'diabetes emergency', 'hypertension crisis',
  'cancer', 'seizure', 'unconscious', 'severe',
];

const ELDERLY_AGE = 50; // 50+ get elderly priority over standard patients

// Base scores per level (higher = served sooner).
const LEVEL_SCORE = {
  critical: 1000,
  high: 700,
  elderly: 400,
  normal: 100,
  low: 50,
};

// Given patient factors, return { score, level, reason, factors }.
function computePriority({ age = 0, conditions = [], isPregnant = false, disability = false, isFollowUp = false } = {}) {
  const normConditions = (conditions || []).map((c) => String(c).toLowerCase().trim()).filter(Boolean);

  const hasCritical = normConditions.some((c) =>
    CRITICAL_CONDITIONS.some((cc) => c.includes(cc))
  );
  const isElderly = Number(age) >= ELDERLY_AGE;

  let level = 'normal';
  let score = LEVEL_SCORE.normal;
  let reason = 'Standard priority';

  if (hasCritical) {
    level = 'critical';
    score = LEVEL_SCORE.critical;
    reason = 'Critical medical condition — served first';
    // extra boost if elderly AND critical
    if (isElderly) score += 100;
  } else if (isPregnant || disability) {
    level = 'high';
    score = LEVEL_SCORE.high;
    reason = isPregnant ? 'Pregnancy — priority care' : 'Special assistance needed';
  } else if (isElderly) {
    level = 'elderly';
    score = LEVEL_SCORE.elderly;
    reason = `Senior citizen (age ${age}) — priority over standard patients`;
    // older seniors slightly higher within the elderly band
    score += Math.min(Number(age) - ELDERLY_AGE, 40);
  }

  // Follow-up (lab-report review) — a quick check-in that shouldn't sit through
  // a full queue just to show reports to the doctor. Prioritised over standard
  // patients, but NEVER downgrades a higher clinical priority (critical /
  // pregnancy / disability keep their higher score).
  if (isFollowUp && score < LEVEL_SCORE.high) {
    level = 'high';
    score = LEVEL_SCORE.high;
    reason = 'Follow-up review (lab reports) — priority over standard patients';
  }

  return {
    score,
    level,
    reason,
    factors: {
      age: Number(age) || 0,
      isElderly,
      hasCriticalCondition: hasCritical,
      isFollowUp: !!isFollowUp,
      conditions: normConditions,
    },
  };
}

// Sort a list of tokens by priority for queue ordering.
// Higher score first; if equal, earlier issuedAt first (FIFO within a level).
function orderByPriority(tokens) {
  return [...tokens].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime();
  });
}

module.exports = { computePriority, orderByPriority, CRITICAL_CONDITIONS, ELDERLY_AGE, LEVEL_SCORE };
