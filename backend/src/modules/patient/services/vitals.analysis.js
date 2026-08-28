// Vitals analysis — 100% local, rule-based health analytics. No external API.
//
// Turns a patient's series of readings into: per-metric status (against
// clinical normal ranges), a trend (rising / falling / stable) computed from
// the reading history, plain-language insights, and an overall health score.
// This is intentionally transparent and explainable — every number here can
// be traced to a rule, which is what you want for health data.

// Severity levels (higher = worse) used for scoring and sorting.
const LEVEL = { normal: 0, elevated: 1, low: 2, high: 3, critical: 4 };

// Points deducted from a 100 health score per abnormal LATEST reading.
const SCORE_PENALTY = { normal: 0, elevated: 8, low: 12, high: 16, critical: 26 };

// Minimum change that counts as a real trend (below this = "stable"),
// so day-to-day noise isn't reported as a rising/falling trend.
const TREND_MIN = {
  systolic: 3, diastolic: 2, heartRate: 3, temperature: 0.3,
  spo2: 1, respiratoryRate: 1, weight: 0.5, bloodSugar: 6,
};

// ── Classifiers (return a status string) ──────────────────────────────────
function classifySystolic(v) {
  if (v < 90) return 'low';
  if (v <= 129) return 'normal';
  if (v <= 139) return 'elevated';
  if (v <= 179) return 'high';
  return 'critical';
}
function classifyDiastolic(v) {
  if (v < 60) return 'low';
  if (v <= 84) return 'normal';
  if (v <= 89) return 'elevated';
  if (v <= 119) return 'high';
  return 'critical';
}
function classifyHeartRate(v) {
  if (v < 50) return 'low';
  if (v < 60) return 'elevated';       // mildly low
  if (v <= 100) return 'normal';
  if (v <= 120) return 'elevated';
  return 'high';
}
function classifyTemp(v) {
  if (v < 95) return 'critical';       // hypothermia
  if (v < 97) return 'low';
  if (v <= 99.5) return 'normal';
  if (v <= 100.3) return 'elevated';
  if (v <= 103) return 'high';
  return 'critical';
}
function classifySpo2(v) {
  if (v >= 95) return 'normal';
  if (v >= 90) return 'low';
  return 'critical';
}
function classifyResp(v) {
  if (v < 12) return 'low';
  if (v <= 20) return 'normal';
  if (v <= 24) return 'elevated';
  return 'high';
}
function classifySugar(v, type) {
  const fasting = type === 'fasting';
  if (v < 70) return 'low';
  if (fasting) {
    if (v <= 99) return 'normal';
    if (v <= 125) return 'elevated';   // pre-diabetic range
    if (v <= 250) return 'high';
    return 'critical';
  }
  // random / post-meal / unspecified
  if (v <= 139) return 'normal';
  if (v <= 199) return 'elevated';
  if (v <= 300) return 'high';
  return 'critical';
}

// Metric metadata for the app (label, unit, icon, which direction is bad).
const META = {
  bloodPressure:   { key: 'bloodPressure',   label: 'Blood Pressure',   unit: 'mmHg',   icon: 'heart',        badWhen: 'higher' },
  heartRate:       { key: 'heartRate',       label: 'Heart Rate',       unit: 'bpm',    icon: 'pulse',        badWhen: 'higher' },
  bloodSugar:      { key: 'bloodSugar',      label: 'Blood Sugar',      unit: 'mg/dL',  icon: 'water',        badWhen: 'higher' },
  temperature:     { key: 'temperature',     label: 'Temperature',      unit: '°F',     icon: 'thermometer',  badWhen: 'higher' },
  spo2:            { key: 'spo2',            label: 'Oxygen (SpO₂)',    unit: '%',      icon: 'fitness',      badWhen: 'lower'  },
  respiratoryRate: { key: 'respiratoryRate', label: 'Respiratory Rate', unit: '/min',   icon: 'cloud',        badWhen: 'higher' },
  weight:          { key: 'weight',          label: 'Weight',           unit: 'kg',     icon: 'scale',        badWhen: 'neutral'},
};

const round = (n, d = 1) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

// Trend from a time-ordered numeric series: compare the recent half's mean to
// the earlier half's mean. Returns { dir, delta }.
function computeTrend(values, key) {
  if (values.length < 2) return { dir: 'stable', delta: 0 };
  const mid = Math.floor(values.length / 2);
  const earlier = avg(values.slice(0, mid || 1));
  const recent = avg(values.slice(mid));
  const delta = recent - earlier;
  const min = TREND_MIN[key] ?? Math.abs(earlier) * 0.03;
  if (delta > min) return { dir: 'rising', delta: round(delta) };
  if (delta < -min) return { dir: 'falling', delta: round(delta) };
  return { dir: 'stable', delta: round(delta) };
}

// Is a trend direction concerning for this metric?
function trendConcerning(badWhen, dir) {
  if (dir === 'stable') return false;
  if (badWhen === 'higher') return dir === 'rising';
  if (badWhen === 'lower') return dir === 'falling';
  return false; // neutral (weight): trend shown but never flagged concerning
}

// ── Main entry ─────────────────────────────────────────────────────────────
// vitals: array of plain Vital objects (any order).
function analyze(vitals = []) {
  // Sort oldest → newest so trends read left-to-right in time.
  const rows = [...vitals].sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));

  const metrics = [];

  // Helper to build a simple single-field metric.
  const buildSimple = (key, classify) => {
    const series = rows
      .filter((r) => r[key] != null && r[key] !== '')
      .map((r) => ({ at: r.recordedAt, v: Number(r[key]) }))
      .filter((p) => !Number.isNaN(p.v));
    if (!series.length) return;
    const values = series.map((p) => p.v);
    const latest = series[series.length - 1];
    const status = classify(latest.v);
    const trend = computeTrend(values, key);
    metrics.push({
      ...META[key],
      latest: latest.v,
      display: `${round(latest.v)} ${META[key].unit}`,
      latestAt: latest.at,
      status,
      level: LEVEL[status],
      trend: trend.dir,
      trendDelta: trend.delta,
      concerningTrend: trendConcerning(META[key].badWhen, trend.dir),
      count: series.length,
      avg: round(avg(values)),
      min: Math.min(...values),
      max: Math.max(...values),
    });
  };

  // Blood pressure — needs both systolic & diastolic; status = worse of the two.
  const bpSeries = rows
    .filter((r) => r.systolic != null && r.diastolic != null)
    .map((r) => ({ at: r.recordedAt, s: Number(r.systolic), d: Number(r.diastolic) }))
    .filter((p) => !Number.isNaN(p.s) && !Number.isNaN(p.d));
  if (bpSeries.length) {
    const latest = bpSeries[bpSeries.length - 1];
    const sStatus = classifySystolic(latest.s);
    const dStatus = classifyDiastolic(latest.d);
    const status = LEVEL[sStatus] >= LEVEL[dStatus] ? sStatus : dStatus;
    const trend = computeTrend(bpSeries.map((p) => p.s), 'systolic');
    metrics.push({
      ...META.bloodPressure,
      latest: `${latest.s}/${latest.d}`,
      display: `${latest.s}/${latest.d} mmHg`,
      latestAt: latest.at,
      status,
      level: LEVEL[status],
      trend: trend.dir,
      trendDelta: trend.delta,
      concerningTrend: trendConcerning('higher', trend.dir),
      count: bpSeries.length,
      avg: `${Math.round(avg(bpSeries.map((p) => p.s)))}/${Math.round(avg(bpSeries.map((p) => p.d)))}`,
      min: null,
      max: null,
    });
  }

  buildSimple('heartRate', classifyHeartRate);

  // Blood sugar — classification depends on each reading's type.
  const sugarSeries = rows
    .filter((r) => r.bloodSugar != null && r.bloodSugar !== '')
    .map((r) => ({ at: r.recordedAt, v: Number(r.bloodSugar), type: r.bloodSugarType || 'random' }))
    .filter((p) => !Number.isNaN(p.v));
  if (sugarSeries.length) {
    const values = sugarSeries.map((p) => p.v);
    const latest = sugarSeries[sugarSeries.length - 1];
    const status = classifySugar(latest.v, latest.type);
    const trend = computeTrend(values, 'bloodSugar');
    metrics.push({
      ...META.bloodSugar,
      latest: latest.v,
      display: `${round(latest.v)} mg/dL (${latest.type})`,
      latestAt: latest.at,
      status,
      level: LEVEL[status],
      trend: trend.dir,
      trendDelta: trend.delta,
      concerningTrend: trendConcerning('higher', trend.dir),
      count: sugarSeries.length,
      avg: round(avg(values)),
      min: Math.min(...values),
      max: Math.max(...values),
    });
  }

  buildSimple('temperature', classifyTemp);
  buildSimple('spo2', classifySpo2);
  buildSimple('respiratoryRate', classifyResp);
  buildSimple('weight', () => 'normal'); // weight has no abnormal status, trend only

  // ── Health score ─────────────────────────────────────────────────────────
  let score = 100;
  for (const m of metrics) {
    if (m.key === 'weight') continue; // neutral
    score -= SCORE_PENALTY[m.status] || 0;
    if (m.concerningTrend) score -= 4; // a worsening trend is a mild extra ding
  }
  score = Math.max(0, Math.min(100, score));

  const rating =
    score >= 85 ? 'Excellent' :
    score >= 70 ? 'Good' :
    score >= 50 ? 'Fair' : 'Needs attention';

  // ── Insights (plain language) ──────────────────────────────────────────────
  const insights = [];
  const abnormal = metrics.filter((m) => m.key !== 'weight' && m.status !== 'normal');
  for (const m of abnormal) {
    const sev = m.level >= LEVEL.high ? 'bad' : 'warn';
    const word = m.status === 'low' ? 'below the normal range'
      : m.status === 'elevated' ? 'slightly above normal'
      : m.status === 'critical' ? 'at a critical level'
      : 'above the normal range';
    insights.push({
      severity: sev,
      metric: m.key,
      text: `Your ${m.label.toLowerCase()} (${m.display}) is ${word}.${m.level >= LEVEL.high ? ' Please consult your doctor.' : ''}`,
    });
  }
  for (const m of metrics) {
    if (m.concerningTrend && m.status === 'normal') {
      insights.push({
        severity: 'warn',
        metric: m.key,
        text: `Your ${m.label.toLowerCase()} has been ${m.trend} across your recent readings — keep an eye on it.`,
      });
    }
  }
  if (!insights.length && metrics.length) {
    insights.push({ severity: 'good', metric: null, text: 'All your recent readings are within normal ranges. Great work — keep it up!' });
  }

  // Sort worst-first so the app shows the most important metric on top.
  metrics.sort((a, b) => b.level - a.level || (b.concerningTrend - a.concerningTrend));

  return {
    hasData: metrics.length > 0,
    totalReadings: rows.length,
    lastReadingAt: rows.length ? rows[rows.length - 1].recordedAt : null,
    score,
    rating,
    metrics,
    insights,
  };
}

module.exports = { analyze, LEVEL };
