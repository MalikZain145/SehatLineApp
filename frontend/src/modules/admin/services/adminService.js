// Admin API — full app control: doctors, patients, reports, account.

import { api } from '../../../services/apiClient';

// Dashboard
async function getDashboard() { return api.get('/admin/dashboard'); }
async function getAnalytics() { return api.get('/admin/analytics'); }

// Doctors
async function listDoctors() { return api.get('/admin/doctors'); }
async function addDoctor(payload) { return api.post('/admin/doctors', payload); }
async function addDoctorsBulk(doctors) { return api.post('/admin/doctors/bulk', { doctors }); }
async function updateDoctor(doctorId, payload) { return api.patch(`/admin/doctors/${doctorId}`, payload); }
async function deleteDoctor(doctorId) { return api.delete(`/admin/doctors/${doctorId}`); }

// Patients
async function listPatients(params = {}) {
  const q = new URLSearchParams(params).toString();
  return api.get(`/admin/patients${q ? `?${q}` : ''}`);
}
async function setChronic(id, isChronic) { return api.patch(`/admin/patients/${id}/chronic`, { isChronic }); }
async function deletePatient(id) { return api.delete(`/admin/patients/${id}`); }

// Reports
async function listReports() { return api.get('/admin/reports'); }
async function resolveReport(id) { return api.patch(`/admin/reports/${id}/resolve`, {}); }
async function replyReport(id, reply) { return api.post(`/admin/reports/${id}/reply`, { reply }); }

// Bulk doctor import from an Excel file. `file` is { uri, name } from a
// document picker; sent as multipart to the parser endpoint.
async function importDoctorsExcel(file) {
  const form = new FormData();
  form.append('file', { uri: file.uri, name: file.name || 'doctors.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return api.postForm('/admin/doctors/import-excel', form);
}

// Pharmacists
async function listPharmacists() { return api.get('/admin/pharmacists'); }
async function addPharmacist(payload) { return api.post('/admin/pharmacists', payload); }
async function addPharmacistsBulk(pharmacists) { return api.post('/admin/pharmacists/bulk', { pharmacists }); }
async function deletePharmacist(id) { return api.delete(`/admin/pharmacists/${id}`); }
async function importPharmacistsExcel(file) {
  const form = new FormData();
  form.append('file', { uri: file.uri, name: file.name || 'pharmacists.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return api.postForm('/admin/pharmacists/import-excel', form);
}

// Live system view (queue models, throughput, traffic, app health).
async function getSystemMetrics() { return api.get('/admin/system/metrics'); }

// System cache (view / clear) + one-tap backend restart.
async function getSystemCache() { return api.get('/admin/system/cache'); }
async function clearSystemCache() { return api.post('/admin/system/cache/clear', {}); }
async function restartSystem() { return api.post('/admin/system/restart', {}); }

// Path of the formatted EXCEL backup (download with an auth header via file-system).
const dataExportPath = '/admin/system/export';

// My notifications (staff reports, requisitions, system) — role-neutral endpoint.
async function getMyNotifications() { return api.get('/notifications'); }
async function markNotificationRead(id) { return api.post(`/notifications/${id}/read`, {}); }
async function markAllNotificationsRead() { return api.post('/notifications/read-all', {}); }

// Announcements → broadcast to staff.
async function createAnnouncement({ title, body, type, audience }) { return api.post('/admin/announcements', { title, body, type, audience }); }
async function listAnnouncements() { return api.get('/admin/announcements'); }
async function deleteAnnouncement(id) { return api.delete(`/admin/announcements/${id}`); }

// Account
async function changePassword(currentPassword, newPassword) {
  return api.post('/admin/change-password', { currentPassword, newPassword });
}

// System ratings (patient feedback about the app/queue/staff/facilities)
async function getRatings(category) {
  const q = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
  return api.get(`/admin/ratings${q}`);
}
async function markRatingReviewed(id) { return api.patch(`/admin/ratings/${id}/reviewed`, {}); }

export default {
  getDashboard, getAnalytics,
  listDoctors, addDoctor, addDoctorsBulk, importDoctorsExcel, updateDoctor, deleteDoctor,
  listPatients, setChronic, deletePatient,
  listReports, resolveReport, replyReport,
  listPharmacists, addPharmacist, addPharmacistsBulk, deletePharmacist, importPharmacistsExcel,
  getRatings, markRatingReviewed,
  getSystemMetrics, getSystemCache, clearSystemCache, restartSystem, dataExportPath,
  getMyNotifications, markNotificationRead, markAllNotificationsRead,
  createAnnouncement, listAnnouncements, deleteAnnouncement,
  changePassword,
};
