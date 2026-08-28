// SehatLine backend supervisor.
//
// Run this INSTEAD of `node server.js` so the admin "Restart System" button can
// restart the backend with no terminal, reliably, on any OS — and with logs
// intact:
//
//     npm run start:managed
//
// How it works: it launches server.js as a child. When the server exits with
// code 42 (the "restart requested" signal sent by the admin panel), the
// supervisor relaunches it after a short pause so the port frees. Any other
// exit code (a real stop or crash) is passed straight through, so this never
// hides a genuine failure or fights Ctrl+C.

const { spawn } = require('child_process');
const path = require('path');

const RESTART_CODE = 42;
const serverFile = path.join(__dirname, 'server.js');
let child = null;
let stopping = false;

function start() {
  child = spawn(process.execPath, [serverFile], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, SEHATLINE_SUPERVISED: '1' },
  });

  child.on('exit', (code) => {
    if (stopping) return;
    if (code === RESTART_CODE) {
      console.log('\n[supervisor] 🔄 Restart requested — relaunching backend…\n');
      setTimeout(start, 700); // brief pause so the TCP port is released
      return;
    }
    // Normal exit or crash — pass the code through and stop supervising.
    process.exit(code == null ? 0 : code);
  });
}

// Forward termination signals so Ctrl+C actually stops everything.
function shutdown(sig) {
  stopping = true;
  try { if (child) child.kill(sig); } catch (e) { /* ignore */ }
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log('[supervisor] Starting SehatLine backend (restartable)…');
start();
