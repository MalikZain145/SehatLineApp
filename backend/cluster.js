// Cluster entry — a built-in load balancer across CPU cores.
//
// `node cluster.js` (or `npm run start:cluster`) forks one Node worker per
// core; the OS/primary distributes incoming connections between them, so the
// API uses every core instead of one. The Python ML service is started ONCE
// by the primary (not per worker). Dead workers are respawned.
//
// Note: for Socket.IO to scale across workers in production, add a sticky
// load balancer + the Redis adapter. For plain HTTP throughput this is enough.
// Default `npm start` stays single-process; use this when you want the cores.

const cluster = require('cluster');
const os = require('os');
const env = require('./src/config/env');

const cores = os.cpus().length;
const want = env.clusterWorkers === 'auto'
  ? cores
  : (parseInt(env.clusterWorkers, 10) > 0 ? parseInt(env.clusterWorkers, 10) : cores);

if (cluster.isPrimary) {
  const logger = require('./src/utils/logger');
  const { startMlService } = require('./src/services/mlProcess');

  logger.info(`Cluster primary ${process.pid} starting ${want} worker(s) on ${cores} core(s)…`);
  startMlService(logger); // once, in the primary

  for (let i = 0; i < want; i++) cluster.fork();

  cluster.on('exit', (worker, code) => {
    logger.warn(`Worker ${worker.process.pid} died (code ${code}) — respawning.`);
    cluster.fork();
  });
} else {
  // Each worker runs the normal server (which skips ML autostart because it's
  // a cluster worker).
  require('./server');
}
