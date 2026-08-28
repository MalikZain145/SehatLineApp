"""Feature engineering + clinical ground-truth for the SehatLine package.

Self-contained (doesn't import the old rule module) so the package works on
its own. The 14 features and the urgency rules match SehatLine's triage policy.
"""

import numpy as np

FEATURES = [
    "age", "is_elderly", "num_chronic_conditions", "has_critical_condition",
    "systolic", "diastolic", "heart_rate", "spo2", "blood_sugar", "temperature",
    "is_pregnant", "has_disability", "days_since_last_visit", "missed_appointments",
]

CRITICAL_KEYWORDS = [
    "heart", "cardiac", "cardio", "chest pain", "stroke", "kidney", "renal",
    "respiratory", "copd", "asthma", "cancer", "seizure", "hypertension crisis",
]

ELDERLY_AGE = 60
LEVELS = [(85, "critical"), (65, "high"), (45, "elderly"), (25, "normal"), (0, "low")]


def level_for(score):
    for threshold, name in LEVELS:
        if score >= threshold:
            return name
    return "low"


def _has_critical(conditions):
    joined = " ".join(str(c).lower() for c in (conditions or []))
    return 1 if any(k in joined for k in CRITICAL_KEYWORDS) else 0


def patient_to_row(p):
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
    if not patients:
        return np.zeros((0, len(FEATURES)), dtype=float)
    return np.array([patient_to_row(p) for p in patients], dtype=float)


def rule_score(X):
    """Vectorised clinical urgency 0-100 — training target + fallback."""
    X = np.asarray(X, dtype=float)
    if X.ndim == 1:
        X = X.reshape(1, -1)
    age, is_elderly, num_cond, critical = X[:, 0], X[:, 1], X[:, 2], X[:, 3]
    systolic, diastolic, hr, spo2 = X[:, 4], X[:, 5], X[:, 6], X[:, 7]
    sugar, temp, pregnant, disability = X[:, 8], X[:, 9], X[:, 10], X[:, 11]
    days_since, missed = X[:, 12], X[:, 13]

    s = np.zeros(X.shape[0])
    s += is_elderly * (15.0 + np.clip(age - ELDERLY_AGE, 0, 30) / 3.0)
    s += critical * 25.0
    s += np.clip(num_cond, 0, 5) * 2.5
    s += (spo2 > 0) * np.where(spo2 < 90, 30.0, np.where(spo2 < 94, 15.0, 0.0))
    s += np.where(systolic >= 180, 25.0, np.where(systolic >= 160, 15.0,
         np.where((systolic > 0) & (systolic < 90), 12.0, 0.0)))
    s += np.where(diastolic >= 110, 12.0, 0.0)
    s += np.where(sugar >= 300, 18.0, np.where(sugar >= 250, 12.0,
         np.where((sugar > 0) & (sugar < 60), 15.0, 0.0)))
    s += np.where(temp >= 103, 15.0, np.where(temp >= 101, 8.0, 0.0))
    s += np.where(hr >= 120, 10.0, np.where((hr > 0) & (hr < 50), 10.0, 0.0))
    s += pregnant * 12.0 + disability * 10.0
    s += np.clip(days_since / 30.0, 0, 4) * 2.0
    s += np.clip(missed, 0, 5) * 1.5
    return np.clip(s, 0, 100)
