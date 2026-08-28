"""
Shared prioritisation core for SehatLine's patient-triage ML service.

Defines the clinical feature set, a vectorised rule-based "ground-truth"
urgency function (used both to generate training data AND as a zero-dependency
fallback when the trained model isn't loaded), and helpers to turn the JSON a
patient booking sends into a numeric feature matrix.

The urgency score is 0-100 (higher = should be seen sooner). The design
mirrors real triage priorities:
  • Elderly patients (60+) are prioritised over younger ones.
  • Critical chronic conditions (heart, kidney, stroke, cancer, respiratory…)
    jump the queue.
  • Dangerous recent vitals (low SpO2, hypertensive crisis, very high sugar,
    fever, abnormal heart rate) push urgency up hard.
  • Pregnancy and disability add priority.
  • A long gap since the last visit / missed appointments nudge it up.
"""

import numpy as np

# Order matters — the model is trained on exactly this column order.
FEATURES = [
    "age",
    "is_elderly",
    "num_chronic_conditions",
    "has_critical_condition",
    "systolic",
    "diastolic",
    "heart_rate",
    "spo2",
    "blood_sugar",
    "temperature",
    "is_pregnant",
    "has_disability",
    "days_since_last_visit",
    "missed_appointments",
]

CRITICAL_KEYWORDS = [
    "heart", "cardiac", "cardio", "chest pain", "stroke", "kidney", "renal",
    "respiratory", "copd", "asthma", "cancer", "seizure", "hypertension crisis",
]

ELDERLY_AGE = 60

LEVELS = [
    (85, "critical"),
    (65, "high"),
    (45, "elderly"),
    (25, "normal"),
    (0, "low"),
]


def level_for(score):
    for threshold, name in LEVELS:
        if score >= threshold:
            return name
    return "low"


def _has_critical(conditions):
    joined = " ".join(str(c).lower() for c in (conditions or []))
    return 1 if any(k in joined for k in CRITICAL_KEYWORDS) else 0


def patient_to_row(p):
    """Convert one incoming patient dict to the numeric feature row."""
    age = float(p.get("age") or 0)
    conditions = p.get("conditions") or []
    return [
        age,
        1.0 if age >= ELDERLY_AGE else 0.0,
        float(len(conditions)),
        float(_has_critical(conditions)),
        float(p.get("systolic") or 0),
        float(p.get("diastolic") or 0),
        float(p.get("heartRate") or 0),
        float(p.get("spo2") or 0),
        float(p.get("bloodSugar") or 0),
        float(p.get("temperature") or 0),
        1.0 if p.get("isPregnant") else 0.0,
        1.0 if p.get("hasDisability") else 0.0,
        float(p.get("daysSinceLastVisit") or 0),
        float(p.get("missedAppointments") or 0),
    ]


def build_matrix(patients):
    """List[dict] -> np.ndarray (n, len(FEATURES))."""
    if not patients:
        return np.zeros((0, len(FEATURES)), dtype=float)
    return np.array([patient_to_row(p) for p in patients], dtype=float)


def rule_score(X):
    """
    Vectorised clinical urgency (0-100) for a feature matrix X.

    This is the ground-truth the ML model learns to approximate, and the
    fallback the service uses if no trained model is available. Fully
    vectorised so it scores tens of thousands of patients in milliseconds.
    """
    X = np.asarray(X, dtype=float)
    if X.ndim == 1:
        X = X.reshape(1, -1)

    age = X[:, 0]
    is_elderly = X[:, 1]
    num_cond = X[:, 2]
    critical = X[:, 3]
    systolic = X[:, 4]
    diastolic = X[:, 5]
    hr = X[:, 6]
    spo2 = X[:, 7]
    sugar = X[:, 8]
    temp = X[:, 9]
    pregnant = X[:, 10]
    disability = X[:, 11]
    days_since = X[:, 12]
    missed = X[:, 13]

    score = np.zeros(X.shape[0], dtype=float)

    # Age / elderly — up to +25, scaled beyond 60.
    score += is_elderly * (15.0 + np.clip(age - ELDERLY_AGE, 0, 30) / 3.0)

    # Critical chronic condition, and comorbidity count.
    score += critical * 25.0
    score += np.clip(num_cond, 0, 5) * 2.5

    # ---- Recent vitals (only when a reading is present, i.e. > 0) ----
    # SpO2 — the strongest single danger signal.
    has_spo2 = spo2 > 0
    score += has_spo2 * np.where(spo2 < 90, 30.0,
                          np.where(spo2 < 94, 15.0, 0.0))

    # Blood pressure.
    score += np.where(systolic >= 180, 25.0,
              np.where(systolic >= 160, 15.0,
              np.where((systolic > 0) & (systolic < 90), 12.0, 0.0)))
    score += np.where(diastolic >= 110, 12.0, 0.0)

    # Blood sugar.
    score += np.where(sugar >= 300, 18.0,
              np.where(sugar >= 250, 12.0,
              np.where((sugar > 0) & (sugar < 60), 15.0, 0.0)))

    # Temperature (fever).
    score += np.where(temp >= 103, 15.0,
              np.where(temp >= 101, 8.0, 0.0))

    # Heart rate.
    score += np.where(hr >= 120, 10.0,
              np.where((hr > 0) & (hr < 50), 10.0, 0.0))

    # Pregnancy / disability.
    score += pregnant * 12.0
    score += disability * 10.0

    # Access-to-care signals.
    score += np.clip(days_since / 30.0, 0, 4) * 2.0
    score += np.clip(missed, 0, 5) * 1.5

    return np.clip(score, 0, 100)
