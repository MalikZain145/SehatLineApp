// Real-time socket connection to the backend.
// Emits/receives queue + stats updates so the UI stays live.
//
// socket.io-client is loaded defensively — if it isn't installed yet, the
// app still works (real-time just won't fire) instead of crashing.

import { getApiBaseUrl } from '../config/api.config';

let ioClient = null;
try {
  // eslint-disable-next-line global-require
  ioClient = require('socket.io-client').io;
} catch (e) {
  ioClient = null;
}

// The base URL ends with /api — strip it for the socket origin. Resolved at
// connect time (not import) so it reflects the dynamically-loaded backend URL.
function getSocketUrl() {
  return getApiBaseUrl().replace(/\/api$/, '');
}

let socket = null;

// Connect once and reuse. Safe to call multiple times.
export function connectSocket() {
  if (!ioClient) return null; // socket.io-client not installed
  if (socket && socket.connected) return socket;
  if (!socket) {
    socket = ioClient(getSocketUrl(), {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      timeout: 8000,
    });
  } else {
    socket.connect();
  }
  return socket;
}

// Subscribe to queue updates. Returns an unsubscribe function.
export function onQueueUpdate(handler) {
  const s = connectSocket();
  if (!s) return () => {}; // no-op if socket unavailable
  s.on('queue:update', handler);
  return () => s.off('queue:update', handler);
}

// Subscribe to Admin portal updates (doctors/patients/reports changed).
export function onAdminUpdate(handler) {
  const s = connectSocket();
  if (!s) return () => {};
  s.on('admin:update', handler);
  return () => s.off('admin:update', handler);
}

// Subscribe to Pharmacy updates (queue / inventory / LP changes).
export function onPharmacyUpdate(handler) {
  const s = connectSocket();
  if (!s) return () => {};
  s.on('pharmacy:update', handler);
  return () => s.off('pharmacy:update', handler);
}

// Subscribe to Blood Donor Network updates (new/responded/fulfilled requests).
export function onBloodUpdate(handler) {
  const s = connectSocket();
  if (!s) return () => {};
  s.on('blood:update', handler);
  return () => s.off('blood:update', handler);
}

// Subscribe to Health Camps updates (new camp / registrations).
export function onHealthCampUpdate(handler) {
  const s = connectSocket();
  if (!s) return () => {};
  s.on('camp:update', handler);
  return () => s.off('camp:update', handler);
}

// Admin-triggered backend restart — connected clients reload once it's back.
export function onSystemRestart(handler) {
  const s = connectSocket();
  if (!s) return () => {};
  s.on('system:restart', handler);
  return () => s.off('system:restart', handler);
}

export function disconnectSocket() {
  if (socket) socket.disconnect();
}

export default { connectSocket, onQueueUpdate, onBloodUpdate, onHealthCampUpdate, onSystemRestart, disconnectSocket };
