"""
Train the SehatLine patient-priority models.

We don't have a labelled historical triage dataset, so we synthesise one from
the clinical rule function (priority_core.rule_score) plus realistic noise —
i.e. the models learn to reproduce expert triage behaviour and generalise
smoothly between cases. Two models are trained and ensembled:

  • GradientBoostingRegressor   — the ML workhorse (tabular, robust).
  • MLPRegressor (neural net)   — the DL component (multi-layer perceptron).

Both are saved to models/. server.py averages them at inference (ensemble).

Run:  python train_model.py
"""

import os
import time
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error
import joblib

from priority_core import FEATURES, rule_score

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(HERE, "models")
RNG = np.random.default_rng(42)


def synth_patients(n):
    """Generate a realistic synthetic feature matrix of n patients."""
    age = RNG.integers(18, 95, n).astype(float)
    is_elderly = (age >= 60).astype(float)
    num_cond = RNG.integers(0, 5, n).astype(float)
    critical = (RNG.random(n) < 0.22).astype(float)

    # Vitals — present ~70% of the time (0 = not recorded).
    def maybe(vals, p=0.7):
        mask = RNG.random(n) < p
        return np.where(mask, vals, 0.0)

    systolic = maybe(RNG.normal(128, 22, n).clip(85, 210))
    diastolic = maybe(RNG.normal(82, 14, n).clip(50, 130))
    hr = maybe(RNG.normal(78, 16, n).clip(45, 150))
    spo2 = maybe(RNG.normal(96, 3.2, n).clip(80, 100))
    sugar = maybe(RNG.normal(130, 55, n).clip(60, 360))
    temp = maybe(RNG.normal(98.6, 1.4, n).clip(96, 105))

    pregnant = (RNG.random(n) < 0.06).astype(float)
    disability = (RNG.random(n) < 0.08).astype(float)
    days_since = RNG.integers(0, 120, n).astype(float)
    missed = RNG.integers(0, 5, n).astype(float)

    X = np.column_stack([
        age, is_elderly, num_cond, critical, systolic, diastolic, hr, spo2,
        sugar, temp, pregnant, disability, days_since, missed,
    ])
    return X


def main():
    os.makedirs(MODEL_DIR, exist_ok=True)
    n = 40000
    print(f"Generating {n} synthetic patients...")
    X = synth_patients(n)
    y_true = rule_score(X)
    # Add heteroscedastic noise so the model must generalise, not memorise.
    y = np.clip(y_true + RNG.normal(0, 4.0, X.shape[0]), 0, 100)

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler().fit(Xtr)
    Xtr_s, Xte_s = scaler.transform(Xtr), scaler.transform(Xte)

    print("Training GradientBoostingRegressor (ML)...")
    t = time.time()
    gbr = GradientBoostingRegressor(n_estimators=300, max_depth=3, learning_rate=0.08, subsample=0.9, random_state=42)
    gbr.fit(Xtr, ytr)
    gbr_pred = gbr.predict(Xte)
    print(f"  done in {time.time()-t:.1f}s · R2={r2_score(yte, gbr_pred):.4f} · MAE={mean_absolute_error(yte, gbr_pred):.2f}")

    print("Training MLPRegressor neural network (DL)...")
    t = time.time()
    mlp = MLPRegressor(hidden_layer_sizes=(64, 32), activation="relu", solver="adam",
                       alpha=1e-4, max_iter=300, early_stopping=True, random_state=42)
    mlp.fit(Xtr_s, ytr)
    mlp_pred = mlp.predict(Xte_s)
    print(f"  done in {time.time()-t:.1f}s · R2={r2_score(yte, mlp_pred):.4f} · MAE={mean_absolute_error(yte, mlp_pred):.2f}")

    # Ensemble = average of both.
    ens = (gbr_pred + mlp_pred) / 2.0
    print(f"Ensemble · R2={r2_score(yte, ens):.4f} · MAE={mean_absolute_error(yte, ens):.2f}")

    joblib.dump({"model": gbr, "features": FEATURES}, os.path.join(MODEL_DIR, "priority_gbr.joblib"))
    joblib.dump({"model": mlp, "scaler": scaler, "features": FEATURES}, os.path.join(MODEL_DIR, "priority_mlp.joblib"))
    print(f"Saved models to {MODEL_DIR}")


if __name__ == "__main__":
    main()
