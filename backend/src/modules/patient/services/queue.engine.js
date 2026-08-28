// ─────────────────────────────────────────────────────────────────────────────
// SehatLine Queue Engine — M/M/s (Erlang C) + Priority + Lag SIPP staffing.
//
// The analytical core of the queue-management plan:
//   • M/M/s (Erlang C): server utilization ρ, P(wait), Wq, Lq, W, L.
//   • Priority classes (critical > urgent/high > elderly > normal), FCFS within
//     a class — waiting time per class via Cobham's non-preemptive approximation.
//   • Lag SIPP: minimum doctors per time period to hit a target wait, with a lag
//     shift so staffing covers the load that just arrived.
//
// All rates are per HOUR. λ = arrivals/hr, μ = patients served/hr PER doctor,
// s = number of doctors (servers).
// ─────────────────────────────────────────────────────────────────────────────

// Erlang C — probability that an arriving patient has to wait (all servers busy).
// a = offered load = λ/μ (Erlangs); s = servers.
function erlangC(s, a) {
  if (s <= 0) return 1;
  const rho = a / s;
  if (rho >= 1) return 1; // unstable: the queue grows without bound → always wait
  // Σ_{k=0}^{s-1} a^k / k!   (built iteratively to avoid overflow)
  let sum = 0;
  let term = 1; // a^0 / 0! = 1
  for (let k = 0; k < s; k++) {
    if (k > 0) term *= a / k;
    sum += term;
  }
  const termS = term * (a / s);       // a^s / s!  (term is a^{s-1}/(s-1)!)
  const top = termS / (1 - rho);
  return top / (sum + top);
}

// Full M/M/s performance metrics for one department.
function mmsMetrics(lambda, mu, s) {
  const a = mu > 0 ? lambda / mu : Infinity; // offered load
  const rho = s > 0 ? a / s : Infinity;      // utilization per server
  const stable = s > 0 && rho < 1;
  const C = stable ? erlangC(s, a) : 1;
  const WqHr = stable ? C / (s * mu - lambda) : Infinity; // hours
  const LqVal = stable ? lambda * WqHr : Infinity;
  const WHr = stable ? WqHr + 1 / mu : Infinity;
  const LVal = stable ? lambda * WHr : Infinity;
  return {
    lambda, mu, s,
    a: round(a),
    rho: round(rho),                                   // utilization 0..1
    stable,
    pWait: round(C),                                   // P(a patient must wait)
    Wq: stable ? round(WqHr * 60) : Infinity,          // avg wait in queue (min)
    Lq: stable ? round(LqVal) : Infinity,              // avg # waiting
    W: stable ? round(WHr * 60) : Infinity,            // avg time in system (min)
    L: stable ? round(LVal) : Infinity,                // avg # in system
  };
}

// Waiting time per priority class (non-preemptive, Cobham approximation for M/M/s).
// classes: [{ name, lambda }] ordered HIGHEST priority first. μ, s shared.
function priorityWaits(classes, mu, s) {
  const lambdaTotal = classes.reduce((sum, c) => sum + c.lambda, 0);
  const agg = mmsMetrics(lambdaTotal, mu, s);
  const rhos = classes.map((c) => c.lambda / (s * mu));
  const out = [];
  let cum = 0;
  for (let k = 0; k < classes.length; k++) {
    const sigmaPrev = cum;
    cum += rhos[k];
    const sigmaK = cum;
    const denom = (1 - sigmaPrev) * (1 - sigmaK);
    // Aggregate M/M/s queue-wait, re-allocated across priority classes.
    const wq = agg.stable && denom > 0
      ? round((agg.Wq) * (1 - agg.rho) / denom)
      : Infinity;
    out.push({ name: classes[k].name, lambda: classes[k].lambda, Wq: wq });
  }
  return { aggregate: agg, classes: out };
}

// Minimum doctors to keep the average queue-wait <= targetWaitMin at load λ.
function serversForTarget(lambda, mu, targetWaitMin, maxServers = 30) {
  for (let s = 1; s <= maxServers; s++) {
    const m = mmsMetrics(lambda, mu, s);
    if (m.stable && m.Wq <= targetWaitMin) return s;
  }
  return maxServers;
}

// Lag SIPP staffing — recommend doctors per time period from forecast demand.
// periods: [{ label, lambda }]. lag shifts a period's need onto the next so the
// tail of a busy period stays covered (the classic SIPP under-staffing fix).
function lagSippStaffing(periods, mu, { targetWaitMin = 15, maxServers = 30, lag = 1 } = {}) {
  const rawNeed = periods.map((p) => serversForTarget(p.lambda, mu, targetWaitMin, maxServers));
  return periods.map((p, i) => {
    const need = rawNeed[i];
    const laggedFrom = i - lag >= 0 ? rawNeed[i - lag] : need;
    const recommendedDoctors = Math.max(need, laggedFrom);
    return {
      label: p.label,
      lambda: p.lambda,
      independentNeed: need,
      recommendedDoctors,
    };
  });
}

function round(x) {
  if (!isFinite(x)) return x;
  return Math.round(x * 100) / 100;
}

module.exports = { erlangC, mmsMetrics, priorityWaits, serversForTarget, lagSippStaffing, round };
