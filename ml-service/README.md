# SehatLine Priority ML Service

A small FastAPI microservice that triages patients so **elderly patients and
those with critical recent vitals are seen first** — even when hundreds book
at once. It powers the priority of Chronic OPD tokens and cardiology
appointments in the SehatLine backend.

## What's inside
- `priority_core.py` — 14 clinical features + a vectorised rule-based urgency
  function (used to generate training data **and** as a zero-dependency
  fallback).
- `train_model.py` — trains two models on synthetic clinical data:
  - **GradientBoostingRegressor** (ML) — `R² ≈ 0.95`
  - **MLPRegressor** neural network (DL) — `R² ≈ 0.90`
  - served as an **ensemble** (average) — `R² ≈ 0.94`
- `server.py` — FastAPI: `GET /health`, `POST /score`, `POST /prioritize`.
- `loadtest.py` — 10,000-patient batch + concurrency benchmark.
- `models/` — pre-trained models (committed, so it runs without retraining).

## Run
```bash
pip install -r requirements.txt
python train_model.py            # optional — models/ already has trained ones
python -m uvicorn server:app --host 127.0.0.1 --port 8000
python loadtest.py               # benchmark
```

The Node backend **auto-starts this service** on boot (`node server.js`), so
normally you don't run it by hand. If Python isn't installed or the service is
down, the backend transparently falls back to the rule-based scorer — booking
never breaks.

## API
`POST /prioritize` — body `{ "patients": [ { age, conditions, systolic,
diastolic, heartRate, spo2, bloodSugar, temperature, isPregnant, hasDisability,
daysSinceLastVisit, missedAppointments } ] }` → returns each patient's
`priorityScore` (0–100), `priorityLevel`, and `rank` (1 = seen first).

> Models are trained on **synthetic** data derived from clinical triage rules
> (no real patient dataset was available). Swap in a real labelled dataset in
> `train_model.py` to fine-tune for production.
