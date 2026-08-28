// Boots the Python priority ML service as a child of the Node server, so a
// single `node server.js` (or `npm start`) brings the whole stack up. It's a
// best-effort helper: if Python isn't installed or the service is already
// running, Node keeps working (the ML client falls back to rule-based scoring).

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const env = require('../config/env');

const ML_DIR = path.join(__dirname, '..', '..', '..', 'ml-service');
let child = null;

function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(`${url}/health`, { timeout: 1200 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

// Try `python` then `python3` — whichever launches uvicorn.
function launch() {
  const port = (env.mlServiceUrl.match(/:(\d+)/) || [, '8000'])[1];
  const args = ['-m', 'uvicorn', 'server:app', '--host', '127.0.0.1', '--port', String(port), '--log-level', 'warning'];
  const candidates = process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];

  for (const bin of candidates) {
    try {
      const c = spawn(bin, args, { cwd: ML_DIR, stdio: 'ignore', shell: false });
      c.on('error', () => {}); // ignore "not found", we'll try the next binary
      return c;
    } catch (e) { /* try next */ }
  }
  return null;
}

async function startMlService(logger) {
  if (!env.mlAutoStart) return;

  // If something is already serving on the ML port, don't spawn a duplicate.
  if (await ping(env.mlServiceUrl)) {
    logger?.info?.(`ML priority service already running at ${env.mlServiceUrl}`);
    return;
  }

  child = launch();
  if (!child) {
    logger?.warn?.('Could not start Python ML service (python not found) — using rule-based fallback.');
    return;
  }

  // Give uvicorn a few seconds to bind, then report.
  const deadline = Date.now() + 12000;
  const check = async () => {
    if (await ping(env.mlServiceUrl)) {
      logger?.success?.(`ML priority service up at ${env.mlServiceUrl}`);
      return;
    }
    if (Date.now() < deadline) return setTimeout(check, 800);
    logger?.warn?.('ML service did not respond in time — using rule-based fallback until it is up.');
  };
  setTimeout(check, 1500);

  // Clean up the child when Node exits.
  const kill = () => { try { child && child.kill(); } catch (e) { /* ignore */ } };
  process.on('exit', kill);
  process.on('SIGINT', () => { kill(); process.exit(0); });
  process.on('SIGTERM', () => { kill(); process.exit(0); });
}

module.exports = { startMlService };
