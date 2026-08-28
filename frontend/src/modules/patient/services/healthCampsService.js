// Health Camps API service — talks to /api/patient/health-camps

import api from '../../../services/apiClient';

async function list() {
  return api.get('/patient/health-camps');
}

async function mine() {
  return api.get('/patient/health-camps/mine');
}

async function register(id) {
  return api.post(`/patient/health-camps/${id}/register`, {});
}

async function unregister(id) {
  return api.post(`/patient/health-camps/${id}/unregister`, {});
}

async function getStats() {
  return api.get('/patient/health-camps/stats');
}

// Testing helper: seed a few upcoming camps (no-op if some already exist).
async function seedDemo() {
  return api.post('/patient/health-camps/demo', {});
}

export default { list, mine, register, unregister, getStats, seedDemo };
