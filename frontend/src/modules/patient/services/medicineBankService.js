// Medicine Donation Bank API service — talks to /api/patient/medicine-bank

import api from '../../../services/apiClient';

async function list({ q, city } = {}) {
  const params = [];
  if (q) params.push(`q=${encodeURIComponent(q)}`);
  if (city) params.push(`city=${encodeURIComponent(city)}`);
  return api.get(`/patient/medicine-bank${params.length ? `?${params.join('&')}` : ''}`);
}

async function mine() {
  return api.get('/patient/medicine-bank/mine');
}

async function donate(payload) {
  return api.post('/patient/medicine-bank', payload);
}

async function claim(id) {
  return api.post(`/patient/medicine-bank/${id}/claim`, {});
}

async function markGiven(id) {
  return api.post(`/patient/medicine-bank/${id}/given`, {});
}

async function remove(id) {
  return api.post(`/patient/medicine-bank/${id}/remove`, {});
}

async function getStats() {
  return api.get('/patient/medicine-bank/stats');
}

export default { list, mine, donate, claim, markGiven, remove, getStats };
