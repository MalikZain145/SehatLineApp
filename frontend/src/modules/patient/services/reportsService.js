// Lab reports API service — talks to /api/patient/reports

import api from '../../../services/apiClient';

async function list() {
  return api.get('/patient/reports');
}

async function getOne(id) {
  return api.get(`/patient/reports/${id}`);
}

async function remove(id) {
  return api.delete(`/patient/reports/${id}`);
}

// Testing helper: seed a few sample reports (no-op if the patient already
// has some). The real laboratory module will create reports in production.
async function seedDemo() {
  return api.post('/patient/reports/demo', {});
}

export default { list, getOne, remove, seedDemo };
