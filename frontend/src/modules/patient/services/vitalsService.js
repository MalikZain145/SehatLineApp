// Vitals API service — talks to /api/patient/vitals

import api from '../../../services/apiClient';

// Save a new reading. payload has any subset of:
//   systolic, diastolic, heartRate, temperature, spo2, respiratoryRate,
//   weight, bloodSugar, bloodSugarType, notes, recordedAt
async function create(payload) {
  return api.post('/patient/vitals', payload);
}

async function list() {
  return api.get('/patient/vitals');
}

// Local health analysis (trends, statuses, insights, score).
async function getAnalysis() {
  return api.get('/patient/vitals/analysis');
}

async function remove(id) {
  return api.delete(`/patient/vitals/${id}`);
}

export default { create, list, getAnalysis, remove };
