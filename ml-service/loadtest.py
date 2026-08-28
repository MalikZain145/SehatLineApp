"""
Load test for the SehatLine priority ML service.

Simulates a booking rush and measures how the "genius" triage holds up:

  1) BATCH   — one /prioritize call ranking 10,000 patients at once
               (the realistic "500+ people booking together" case, at 20x).
  2) CONCURRENCY — many parallel /score requests to measure per-request
               latency (p50/p95/p99) and throughput under load.
  3) CORRECTNESS — verifies the ranking actually puts elderly / critical-vitals
               patients first (a fast system that ranks wrong is useless).

Run (service must be up on :8000):  python loadtest.py
"""

import json
import time
import statistics
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = "http://127.0.0.1:8000"
import numpy as np
RNG = np.random.default_rng(7)


def make_patient(i):
    age = int(RNG.integers(18, 95))
    critical = RNG.random() < 0.2
    has_vitals = RNG.random() < 0.7
    return {
        "id": f"P{i}",
        "age": age,
        "conditions": (["heart disease"] if critical else []) + (["diabetes"] if RNG.random() < 0.3 else []),
        "systolic": int(RNG.normal(128, 22)) if has_vitals else 0,
        "diastolic": int(RNG.normal(82, 14)) if has_vitals else 0,
        "heartRate": int(RNG.normal(78, 16)) if has_vitals else 0,
        "spo2": int(RNG.normal(96, 3.5)) if has_vitals else 0,
        "bloodSugar": int(RNG.normal(130, 55)) if has_vitals else 0,
        "temperature": round(float(RNG.normal(98.6, 1.4)), 1) if has_vitals else 0,
        "isPregnant": bool(RNG.random() < 0.06),
        "hasDisability": bool(RNG.random() < 0.08),
        "daysSinceLastVisit": int(RNG.integers(0, 120)),
        "missedAppointments": int(RNG.integers(0, 5)),
    }


def post(path, payload, timeout=120):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(BASE + path, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def pct(sorted_vals, p):
    if not sorted_vals:
        return 0.0
    k = min(len(sorted_vals) - 1, int(round((p / 100.0) * (len(sorted_vals) - 1))))
    return sorted_vals[k]


def main():
    N = 10000
    print(f"Building {N} synthetic patients...")
    patients = [make_patient(i) for i in range(N)]

    health = json.loads(urllib.request.urlopen(BASE + "/health", timeout=10).read().decode())
    engine = health.get("engine")
    print("Engine:", engine)

    # ---- 1) BATCH: rank all N in one request ----
    t = time.perf_counter()
    res = post("/prioritize", {"patients": patients})
    batch_ms = (time.perf_counter() - t) * 1000
    ranked = res["ranked"]
    per_patient_us = (batch_ms * 1000) / N

    # ---- 3) CORRECTNESS on the batch result ----
    id_to_patient = {p["id"]: p for p in patients}
    top = ranked[: N // 10]  # top 10%
    bottom = ranked[-N // 10:]  # bottom 10%
    def avg_age(group):
        return statistics.mean(id_to_patient[r["id"]]["age"] for r in group)
    def frac_critical(group):
        return statistics.mean(1 if id_to_patient[r["id"]]["conditions"] and any("heart" in c for c in id_to_patient[r["id"]]["conditions"]) else 0 for r in group)
    def frac_low_spo2(group):
        return statistics.mean(1 if 0 < id_to_patient[r["id"]]["spo2"] < 94 else 0 for r in group)
    top_age, bot_age = avg_age(top), avg_age(bottom)
    top_crit, bot_crit = frac_critical(top), frac_critical(bottom)
    top_spo2, bot_spo2 = frac_low_spo2(top), frac_low_spo2(bottom)

    # ---- 2) CONCURRENCY: parallel /score requests ----
    CONC_REQUESTS = 2000
    WORKERS = 50
    sample = [patients[int(RNG.integers(0, N))] for _ in range(CONC_REQUESTS)]
    lat = []
    def one(p):
        s = time.perf_counter()
        post("/score", p, timeout=30)
        return (time.perf_counter() - s) * 1000
    t = time.perf_counter()
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        for ms in ex.map(one, sample):
            lat.append(ms)
    wall = time.perf_counter() - t
    lat.sort()
    rps = CONC_REQUESTS / wall

    stats = {
        "engine": engine,
        "batch_n": N,
        "batch_ms": round(batch_ms, 1),
        "per_patient_us": round(per_patient_us, 2),
        "batch_throughput_per_s": round(N / (batch_ms / 1000)),
        "conc_requests": CONC_REQUESTS,
        "workers": WORKERS,
        "rps": round(rps),
        "p50_ms": round(pct(lat, 50), 2),
        "p95_ms": round(pct(lat, 95), 2),
        "p99_ms": round(pct(lat, 99), 2),
        "max_ms": round(lat[-1], 2),
        "top10_avg_age": round(top_age, 1),
        "bottom10_avg_age": round(bot_age, 1),
        "top10_frac_critical": round(top_crit, 3),
        "bottom10_frac_critical": round(bot_crit, 3),
        "top10_frac_low_spo2": round(top_spo2, 3),
        "bottom10_frac_low_spo2": round(bot_spo2, 3),
    }
    print("\nRESULT_JSON " + json.dumps(stats))
    return stats


if __name__ == "__main__":
    main()
