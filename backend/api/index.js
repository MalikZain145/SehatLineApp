// Vercel serverless entry — wraps the Express REST API.
//
// IMPORTANT: Socket.IO (live queue), node-cron (daily backup) and the Python ML
// subprocess do NOT run on Vercel — serverless has no persistent process. The
// REST API + MongoDB work; the mobile app falls back to pull-to-refresh for the
// queue instead of instant live updates. For the full real-time experience,
// deploy on a persistent server (e.g. Render) instead.
process.env.ML_AUTOSTART = 'false';

const app = require('../src/app');
const { connectDBCached } = require('../src/config/db');

module.exports = async (req, res) => {
  try {
    await connectDBCached();
  } catch (e) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, code: 'DB_DOWN', message: 'Database connection failed. Check MONGO_URI (must be a cloud Atlas URI on Vercel).' }));
    return;
  }
  return app(req, res);
};
