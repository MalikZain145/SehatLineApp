// Token API service — talks to /api/patient/*

import api from '../../../services/apiClient';

// Generate a new token (goes into Chronic OPD queue).
async function generate(extra = {}) {
  // extra can include { chronicIllness, conditions, isPregnant, disability,
  // followUp } — chronicIllness routes to the right doctor, followUp issues a
  // reports-only token within the 30-day window.
  return api.post('/patient/tokens/generate', extra);
}

// Chronic OPD config: illness → doctor choices, plus the patient's current
// 30-day lock state and whether a follow-up (reports-only) token is allowed.
async function getChronicConfig() {
  return api.get('/patient/chronic/config');
}

// Get my current active token (null if none).
async function getActive() {
  return api.get('/patient/tokens/active');
}

// Get the live queue for a department.
async function getQueue(department = 'chronic_opd') {
  return api.get(`/patient/tokens/queue/${department}`);
}

// Advance the token journey.
// action: 'move_to_pharmacy' | 'pharmacy_done' | 'get_lab_token' | 'complete'
async function advance(tokenId, action) {
  return api.post(`/patient/tokens/${tokenId}/advance`, { action });
}

// Simulate a staff member (doctor/pharmacist/lab) calling the next patient.
// For the doctor, optionally pass prescribedTests to route the patient to the
// lab after pharmacy.
async function callNext(department = 'chronic_opd', prescribedTests = []) {
  return api.post('/patient/tokens/call-next', { department, prescribedTests });
}

// Hospital stats for the Home screen.
async function getStats() {
  return api.get('/patient/stats');
}

// Live queue summary for all departments (Home screen live queue).
async function getQueuesSummary() {
  return api.get('/patient/queues/summary');
}

export default { generate, getChronicConfig, getActive, getQueue, advance, callNext, getStats, getQueuesSummary };
