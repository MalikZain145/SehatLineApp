// Chronic OPD configuration — which doctor sees which chronic illness.
//
// This is the single source of truth the token flow uses to (a) tell a
// patient which doctor they'll see for their illness, and (b) auto-fill a
// realistic default prescription. It's a static map for now; when the admin
// module lands it will manage these doctors + their conditions in the DB.
// The Doctor collection is seeded from this same list (seed-chronic-doctors)
// so the future module has real rows to edit.

const CHRONIC_DOCTORS = [
  {
    doctorId: 'chronic_endo',
    name: 'Dr. Muhammad Khan',
    specialization: 'Endocrinologist',
    room: 'Room D-201',
    conditions: ['Diabetes', 'Thyroid Disorder'],
  },
  {
    doctorId: 'chronic_cardio',
    name: 'Dr. Sarah Ahmed',
    specialization: 'Cardiologist',
    room: 'Room D-202',
    conditions: ['Hypertension', 'Heart Disease'],
  },
  {
    doctorId: 'chronic_pulmo',
    name: 'Dr. Fatima Ali',
    specialization: 'Pulmonologist',
    room: 'Room D-203',
    conditions: ['Asthma', 'COPD'],
  },
  {
    doctorId: 'chronic_nephro',
    name: 'Dr. Bilal Raza',
    specialization: 'Nephrologist',
    room: 'Room D-204',
    conditions: ['Kidney Disease'],
  },
  {
    doctorId: 'chronic_rheuma',
    name: 'Dr. Ayesha Malik',
    specialization: 'Rheumatologist',
    room: 'Room D-205',
    conditions: ['Arthritis'],
  },
];

// A sensible default prescription per illness, so the simulated doctor
// hands the pharmacy something real. The future doctor module will replace
// these with what the doctor actually prescribes.
const DEFAULT_MEDS = {
  'Diabetes': ['Metformin 500mg', 'Glimepiride 2mg'],
  'Hypertension': ['Amlodipine 5mg', 'Losartan 50mg'],
  'Heart Disease': ['Aspirin 75mg', 'Atorvastatin 20mg'],
  'Asthma': ['Salbutamol Inhaler', 'Montelukast 10mg'],
  'COPD': ['Ipratropium Inhaler', 'Theophylline 200mg'],
  'Thyroid Disorder': ['Levothyroxine 50mcg'],
  'Kidney Disease': ['Furosemide 40mg', 'Calcium Acetate'],
  'Arthritis': ['Diclofenac 50mg', 'Calcium + Vitamin D'],
};

// Illness → an "icon hint" the app can map to an Ionicon.
// Ionicons chosen to match each condition as closely as the icon set allows.
const CONDITION_ICONS = {
  'Diabetes': 'water',            // blood sugar (blood drop)
  'Thyroid Disorder': 'body',     // endocrine / body
  'Hypertension': 'pulse',        // blood pressure reading
  'Heart Disease': 'heart',       // cardiac
  'Asthma': 'cloud',              // breathing / airways
  'COPD': 'cloudy',               // chronic respiratory
  'Kidney Disease': 'water-outline', // renal / fluids
  'Arthritis': 'walk',            // joints / mobility
};

// Flat list of { condition, icon, doctor } for the app to render as choices.
function listConditions() {
  const out = [];
  for (const d of CHRONIC_DOCTORS) {
    for (const condition of d.conditions) {
      out.push({
        condition,
        icon: CONDITION_ICONS[condition] || 'medkit',
        doctor: {
          doctorId: d.doctorId,
          name: d.name,
          specialization: d.specialization,
          room: d.room,
        },
      });
    }
  }
  // Alphabetical so the list is stable.
  return out.sort((a, b) => a.condition.localeCompare(b.condition));
}

// Which doctor handles a given illness (case-insensitive). Falls back to a
// general physician so a token can always be issued.
function doctorForCondition(condition) {
  const norm = String(condition || '').trim().toLowerCase();
  const doc = CHRONIC_DOCTORS.find((d) =>
    d.conditions.some((c) => c.toLowerCase() === norm)
  );
  if (doc) {
    return { doctorId: doc.doctorId, name: doc.name, specialization: doc.specialization, room: doc.room };
  }
  return { doctorId: 'chronic_gp', name: 'Dr. On-Duty Physician', specialization: 'General Physician', room: 'Room D-200' };
}

function defaultMedsFor(condition) {
  return DEFAULT_MEDS[condition] || ['As prescribed by doctor'];
}

module.exports = {
  CHRONIC_DOCTORS, DEFAULT_MEDS, CONDITION_ICONS,
  listConditions, doctorForCondition, defaultMedsFor,
};
