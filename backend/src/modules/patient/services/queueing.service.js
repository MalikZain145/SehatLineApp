// Queueing-theory engine for the OPD queue.
//
// Based on classic M/M/s queueing (Erlang C), the model Linda Green describes
// for healthcare in "Queueing Theory and Modeling". The single most effective
// lever to cut waiting is SERVER POOLING: one shared queue feeding every
// on-duty doctor beats separate per-doctor lines. SehatLine already keeps ONE
// priority-ordered OPD queue, so whichever doctor becomes free pulls the next
// (highest-priority) patient — that is pooling in action.
//
// This service adds the maths on top: given the arrival rate, the mean
// consultation time and how many doctors are on duty, it predicts the
// expected wait (Wq), utilisation (ρ) and probability of waiting (Erlang C),
// and estimates each waiting patient's wait. It also picks the least-loaded
// doctor for load-balancing.

// Factorial (small s only, memoised).
const _fact = [1];
function factorial(n) {
  for (let i = _fact.length; i <= n; i++) _fact[i] = _fact[i - 1] * i;
  return _fact[n];
}

// Erlang C: probability that an arriving patient has to WAIT (all servers busy)
// in an M/M/s system with offered load a = λ/μ and s servers.
function erlangC(s, a) {
  if (s <= 0) return 1;
  const rho = a / s;
  if (rho >= 1) return 1; // unstable / saturated — everyone waits
  let sum = 0;
  for (let k = 0; k < s; k++) sum += Math.pow(a, k) / factorial(k);
  const last = Math.pow(a, s) / (factorial(s) * (1 - rho));
  return last / (sum + last);
}

// Core metrics for an M/M/s queue.
//   lambda = arrivals per hour
//   muPerServer = services per hour per doctor (= 60 / avgConsultMinutes)
//   servers = on-duty doctors
function metrics({ lambda, muPerServer, servers }) {
  const s = Math.max(1, Math.floor(servers || 1));
  const mu = muPerServer > 0 ? muPerServer : 6; // default 10-min consults
  const a = lambda / mu;                 // offered load (Erlangs)
  const rho = a / s;                     // utilisation
  const stable = rho < 1;
  const pWait = erlangC(s, a);
  // Average wait in queue (hours), then minutes.
  const wqHours = stable ? pWait / (s * mu - lambda) : Infinity;
  const wqMin = stable ? wqHours * 60 : 999;
  const lq = stable ? lambda * wqHours : Infinity; // avg number waiting
  return {
    servers: s,
    offeredLoad: round(a),
    utilization: round(rho),
    stable,
    probWait: round(pWait),
    avgWaitMin: stable ? Math.round(wqMin) : 999,
    avgQueueLen: stable ? round(lq) : 999,
  };
}

// Estimate a patient's wait given their POSITION in a pooled priority queue
// and how fast the on-duty doctors clear patients. With s doctors each taking
// ~consultMin, the queue drains at s/consultMin patients per minute, so the
// patient at position p waits about p * consultMin / s minutes.
function estimateWaitForPosition(position, servers, consultMin) {
  const s = Math.max(1, servers || 1);
  const c = consultMin > 0 ? consultMin : 10;
  const ahead = Math.max(0, position); // patients ahead
  return Math.round((ahead * c) / s);
}

// Load balancing: pick the doctor with the fewest patients currently assigned
// (shortest line) — pooling's practical form when routing a new patient.
function leastLoadedDoctor(doctorLoads) {
  // doctorLoads: [{ doctorId, name, load }]
  if (!doctorLoads || !doctorLoads.length) return null;
  return doctorLoads.reduce((best, d) => (d.load < best.load ? d : best), doctorLoads[0]);
}

function round(n, d = 3) {
  if (!isFinite(n)) return n;
  return Math.round(n * 10 ** d) / 10 ** d;
}

module.exports = { erlangC, metrics, estimateWaitForPosition, leastLoadedDoctor };
