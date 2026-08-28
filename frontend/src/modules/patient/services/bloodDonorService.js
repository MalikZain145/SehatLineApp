// Blood Donor Network API service — talks to /api/patient/blood/*

import api from '../../../services/apiClient';

// ---- Donor profile ----
async function getDonorStatus() {
  return api.get('/patient/blood/donor/me');
}

async function optIn({ bloodGroup, city, lastDonationAt }) {
  return api.post('/patient/blood/donor/opt-in', { bloodGroup, city, lastDonationAt });
}

async function optOut() {
  return api.post('/patient/blood/donor/opt-out', {});
}

// ---- Requests ----
async function listRequests(onlyCompatible = false) {
  return api.get(`/patient/blood/requests${onlyCompatible ? '?onlyCompatible=1' : ''}`);
}

async function myRequests() {
  return api.get('/patient/blood/requests/mine');
}

async function createRequest({ patientName, bloodGroup, unitsNeeded, hospital, city, contactPhone, notes, urgency }) {
  return api.post('/patient/blood/requests', { patientName, bloodGroup, unitsNeeded, hospital, city, contactPhone, notes, urgency });
}

async function respond(id) {
  return api.post(`/patient/blood/requests/${id}/respond`, {});
}

async function fulfill(id) {
  return api.post(`/patient/blood/requests/${id}/fulfill`, {});
}

async function cancel(id) {
  return api.post(`/patient/blood/requests/${id}/cancel`, {});
}

async function getStats() {
  return api.get('/patient/blood/stats');
}

export default {
  getDonorStatus, optIn, optOut,
  listRequests, myRequests, createRequest, respond, fulfill, cancel,
  getStats,
};
