// Notification API service — bell menu and health tips.

import api from '../../../services/apiClient';

// Fetching the list also delivers the health tip due for the current slot.
async function list() {
  return api.get('/patient/notifications');
}

async function unreadCount() {
  return api.get('/patient/notifications/unread-count');
}

async function markRead(id) {
  return api.post(`/patient/notifications/${id}/read`, {});
}

async function markAllRead() {
  return api.post('/patient/notifications/read-all', {});
}

async function remove(id) {
  return api.delete(`/patient/notifications/${id}`);
}

export default { list, unreadCount, markRead, markAllRead, remove };
