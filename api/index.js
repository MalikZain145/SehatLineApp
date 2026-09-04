// Vercel serverless entry AT REPO ROOT — used when Vercel's Root Directory is
// the repository root (default). It wraps the Express app that lives in backend/.
// (backend/api/index.js is the equivalent for when Root Directory = backend.)
//
// NOTE: Socket.IO (live queue), node-cron and the ML subprocess do NOT run on
// Vercel (serverless). REST API + MongoDB work; the app uses pull-to-refresh.
process.env.ML_AUTOSTART = 'false';

const app = require('../backend/src/app');
const { connectDBCached } = require('../backend/src/config/db');

module.exports = async (req, res) => {
  try {
    await connectDBCached();
  } catch (e) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, code: 'DB_DOWN', message: 'Database connection failed. Set MONGO_URI (Atlas) in Vercel env vars.' }));
    return;
  }
  return app(req, res);
};
