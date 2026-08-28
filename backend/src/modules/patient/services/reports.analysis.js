// Lab report analysis — 100% local, rule-based. No external API.
//
// For any report it: (1) decides each parameter's status against its
// reference range, (2) counts abnormal values, (3) produces plain-language
// suggestions the patient can act on, keyed to common lab parameters, and
// (4) writes a one-line summary. Designed to handle ANY report shape — if a
// parameter has numeric bounds it's judged numerically; otherwise it falls
// back to the lab's own status or a text match.

// Suggestions keyed by a substring of the (lowercased) parameter name.
// Each entry: what a HIGH or LOW value tends to mean + a practical tip.
const SUGGESTIONS = [
  { match: ['ldl', 'cholesterol', 'triglyceride'], high: 'Raised blood lipids increase heart risk. Cut fried/oily food, walk 30 min daily, and ask your doctor about a lipid-lowering plan.' },
  { match: ['hdl'], low: 'Low HDL (good cholesterol) is linked to heart risk. Regular exercise and healthy fats (nuts, olive oil) help raise it.' },
  { match: ['glucose', 'sugar', 'hba1c'], high: 'High blood sugar suggests poor glucose control. Reduce sugar/refined carbs, stay active, and review your diabetes plan with your doctor.', low: 'Low blood sugar can cause dizziness. Keep a quick sugar source handy and discuss dosing with your doctor.' },
  { match: ['hemoglobin', 'haemoglobin', 'hb'], low: 'Low hemoglobin may indicate anaemia. Iron-rich foods (green leafy veg, dates, red meat) and a doctor review are advised.' },
  { match: ['wbc', 'white blood', 'leucocyte', 'leukocyte'], high: 'A high white cell count can signal infection or inflammation. If you feel unwell, see your doctor.', low: 'A low white cell count can reduce immunity. Avoid infection exposure and consult your doctor.' },
  { match: ['platelet'], low: 'Low platelets can affect clotting. Avoid injury and discuss with your doctor promptly.', high: 'High platelets should be reviewed by your doctor.' },
  { match: ['tsh'], high: 'A high TSH suggests an underactive thyroid (hypothyroidism). Your doctor may check thyroid hormones and treatment.', low: 'A low TSH can suggest an overactive thyroid. A doctor review is recommended.' },
  { match: ['creatinine', 'urea', 'egfr'], high: 'Raised kidney values need attention. Stay hydrated, avoid unnecessary painkillers, and consult your doctor.' },
  { match: ['alt', 'ast', 'sgpt', 'sgot', 'bilirubin', 'alkaline'], high: 'Raised liver values should be reviewed. Avoid alcohol and self-medication, and see your doctor.' },
  { match: ['uric acid'], high: 'High uric acid can cause gout. Reduce red meat/organ meat and sugary drinks, drink more water.' },
  { match: ['vitamin d', '25-oh'], low: 'Vitamin D deficiency is very common. Safe morning sun exposure and a supplement (as advised) help.' },
  { match: ['vitamin b12', 'b12'], low: 'Low B12 can cause fatigue and nerve symptoms. Dietary sources or supplements may be advised by your doctor.' },
  { match: ['t[3-4]', 't3', 't4'], high: 'Abnormal thyroid hormone — pair this with your TSH result and see your doctor.' },
];

const round = (n) => Math.round(n * 100) / 100;

function toNumber(v) {
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isNaN(n) ? null : n;
}

// Decide a single result's status.
function statusOf(r) {
  // Trust an explicit lab status if it's a real one.
  if (r.status && ['high', 'low', 'abnormal'].includes(r.status)) return r.status;
  if (r.status === 'normal') return 'normal';

  const val = toNumber(r.value);
  if (val == null) {
    // Text value (e.g. 'Negative'/'Positive'): compare to refText if present.
    if (r.refText) {
      const same = String(r.value).trim().toLowerCase() === String(r.refText).trim().toLowerCase();
      return same ? 'normal' : 'abnormal';
    }
    return 'normal';
  }
  if (r.refLow != null && val < r.refLow) return 'low';
  if (r.refHigh != null && val > r.refHigh) return 'high';
  return 'normal';
}

function suggestionFor(name, status) {
  const key = String(name).toLowerCase();
  for (const s of SUGGESTIONS) {
    if (s.match.some((m) => key.includes(m))) {
      if (status === 'high' && s.high) return s.high;
      if (status === 'low' && s.low) return s.low;
      if (status === 'abnormal' && (s.high || s.low)) return s.high || s.low;
    }
  }
  return null;
}

function analyzeReport(report) {
  const results = (report.results || []).map((r) => {
    const status = statusOf(r);
    return {
      name: r.name,
      value: r.value,
      unit: r.unit || '',
      refLow: r.refLow,
      refHigh: r.refHigh,
      refText: r.refText || '',
      range: r.refText || (r.refLow != null && r.refHigh != null ? `${r.refLow}–${r.refHigh}` : (r.refHigh != null ? `< ${r.refHigh}` : (r.refLow != null ? `> ${r.refLow}` : '—'))),
      status,
    };
  });

  const abnormal = results.filter((r) => r.status !== 'normal');

  const suggestions = [];
  for (const r of abnormal) {
    const tip = suggestionFor(r.name, r.status);
    suggestions.push({
      param: r.name,
      status: r.status,
      severity: r.status === 'high' || r.status === 'abnormal' ? 'warn' : r.status === 'low' ? 'warn' : 'info',
      text: tip || `${r.name} (${r.value}${r.unit ? ' ' + r.unit : ''}) is ${r.status === 'high' ? 'above' : r.status === 'low' ? 'below' : 'outside'} the normal range — discuss it with your doctor.`,
    });
  }

  const overall = abnormal.length === 0 ? 'Normal' : 'Abnormal';
  const summary = abnormal.length === 0
    ? 'All parameters are within their normal ranges.'
    : `${abnormal.length} of ${results.length} parameter${results.length === 1 ? '' : 's'} are outside the normal range. See the suggestions below.`;

  if (!suggestions.length && abnormal.length === 0) {
    suggestions.push({ param: null, status: 'normal', severity: 'good', text: 'Great — everything looks normal. Keep up your healthy routine and follow-up as advised.' });
  }

  return {
    results,
    total: results.length,
    normalCount: results.length - abnormal.length,
    abnormalCount: abnormal.length,
    overall,
    summary,
    suggestions,
  };
}

module.exports = { analyzeReport, statusOf };
