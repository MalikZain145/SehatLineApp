// Centralized environment configuration.
// Everything reads from here instead of process.env directly,
// so defaults live in one place.

require('dotenv').config();

// Some networks' default DNS resolver refuses SRV lookups — the record type that
// `mongodb+srv://` Atlas URIs depend on — which surfaces as
// "querySrv ECONNREFUSED ..._mongodb._tcp...". Point Node's resolver at public
// DNS first (system servers kept as fallback) so Atlas resolves on any network.
// Harmless in production: public DNS resolves all of our external hosts too.
try {
  const dns = require('dns');
  const existing = typeof dns.getServers === 'function' ? dns.getServers() : [];
  dns.setServers(['8.8.8.8', '1.1.1.1', ...existing.filter((s) => s !== '8.8.8.8' && s !== '1.1.1.1')]);
} catch (e) { /* non-fatal — keep the system resolver */ }

const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Local MongoDB by default (make sure the MongoDB service is running). Set
  // MONGO_URI in .env to point at a different database (e.g. Atlas) if needed.
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/SehatLineApp',

  jwtSecret: process.env.JWT_SECRET || 'dev_insecure_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  sessionInactivityMinutes: parseInt(process.env.SESSION_INACTIVITY_MINUTES || '5', 10),

  // Python priority ML service.
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
  // Auto-start the Python service when the Node server boots.
  mlAutoStart: (process.env.ML_AUTOSTART || 'true') !== 'false',
  // Node cluster workers (0 = single process). 'auto' = CPU cores.
  clusterWorkers: process.env.CLUSTER_WORKERS || '0',

  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    appPassword: process.env.EMAIL_APP_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'SehatLine <no-reply@sehatline.app>',
  },

};

// Fail-fast in production if secrets were left at their insecure dev defaults.
// A predictable JWT secret means anyone can forge valid tokens — refuse to boot
// rather than run wide open. (In development we only warn, so local dev still
// works out of the box.)
if (env.nodeEnv === 'production') {
  const problems = [];
  if (!process.env.JWT_SECRET || env.jwtSecret === 'dev_insecure_secret_change_me' || env.jwtSecret.length < 32) {
    problems.push('JWT_SECRET must be set to a strong (32+ char) random value');
  }
  if (!process.env.MONGO_URI) {
    problems.push('MONGO_URI must be set (never rely on the localhost default in production)');
  }
  if (problems.length) {
    // eslint-disable-next-line no-console
    console.error('\n🚨 Insecure production configuration:\n - ' + problems.join('\n - ') + '\n');
    process.exit(1);
  }
} else if (env.jwtSecret === 'dev_insecure_secret_change_me') {
  // eslint-disable-next-line no-console
  console.warn('⚠️  Using the default dev JWT secret. Set JWT_SECRET before deploying.');
}

module.exports = env;
