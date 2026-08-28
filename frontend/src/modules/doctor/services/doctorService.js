// Doctor module API service — talks to /api/doctor/*

import api from '../../../services/apiClient';

async function getDashboard() {
  return api.get('/doctor/dashboard');
}

async function getQueue() {
  return api.get('/doctor/queue');
}

async function getConsultation(tokenId) {
  return api.get(`/doctor/consult/${tokenId}`);
}

async function startConsult(tokenId) {
  return api.post(`/doctor/consult/${tokenId}/start`, {});
}

// Finish current patient + prescription + auto-load next.
async function proceed(tokenId, { diagnosis, clinicalNotes, medicines, medicineItems, tests }) {
  return api.post(`/doctor/consult/${tokenId}/proceed`, { diagnosis, clinicalNotes, medicines, medicineItems, tests });
}

// Catalogs the prescription form pulls from.
async function getLabTests() { return api.get('/doctor/lab-tests'); }
async function getMedicines() { return api.get('/doctor/medicines'); }

// Enable Chronic OPD for the patient in the current consultation.
async function markChronic(tokenId) {
  return api.post(`/doctor/consult/${tokenId}/chronic`, {});
}

async function getProfile() {
  return api.get('/doctor/profile');
}

async function updateProfile(payload) {
  return api.patch('/doctor/profile', payload);
}

// Important updates only (appointments, system/admin announcements) — the
// server excludes queue/token notifications so the bell doesn't duplicate the
// live queue.
async function getNotifications() {
  return api.get('/doctor/notifications');
}

async function markAllNotificationsRead() {
  return api.post('/doctor/notifications/read-all', {});
}

// Live reviews left for THIS doctor (avg + distribution + list).
async function getReviews() {
  return api.get('/doctor/reviews');
}

// Doctor replies to a patient's review → patient gets it as a notification.
async function replyToReview(id, reply) {
  return api.post(`/doctor/reviews/${id}/reply`, { reply });
}

// This doctor's OWN live queue (cardiology appointments or their chronic pool).
async function getMyQueue() {
  return api.get('/doctor/my-queue');
}

// Working days + hours (shown to patients for booking).
async function getAvailability() {
  return api.get('/doctor/availability');
}
async function updateAvailability(detail) {
  return api.patch('/doctor/availability', { detail });
}

// On/off duty. active=false → patients can't see or book this doctor.
async function setDutyStatus(active) {
  return api.patch('/doctor/availability', { active });
}

// Doctor writes a note that is delivered to the admin(s).
async function reportToAdmin(message) {
  return api.post('/doctor/report', { message });
}

// Doctor workspace settings — synced across devices.
async function getSettings() {
  return api.get('/doctor/settings');
}
async function updateSettings(patch) {
  return api.patch('/doctor/settings', patch);
}

// Awareness Camps — a doctor runs their own camps (shown to patients).
async function listMyCamps() { return api.get('/doctor/camps'); }
async function createCamp(payload) { return api.post('/doctor/camps', payload); }
async function deleteCamp(id) { return api.delete(`/doctor/camps/${id}`); }

export default {
  getDashboard, getQueue, getMyQueue, getConsultation, startConsult, proceed, markChronic,
  getLabTests, getMedicines,
  getProfile, updateProfile, getNotifications, markAllNotificationsRead, getReviews, replyToReview,
  getAvailability, updateAvailability, setDutyStatus, reportToAdmin, getSettings, updateSettings,
  listMyCamps, createCamp, deleteCamp,
};
