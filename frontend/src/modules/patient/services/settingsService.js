// Settings API service — preferences, profile pic, biometric, rating.

import api from '../../../services/apiClient';

async function getSettings() {
  return api.get('/auth/settings');
}

async function updatePreferences(prefs) {
  return api.patch('/auth/settings/preferences', prefs);
}

async function updateProfilePic(profilePic) {
  return api.patch('/auth/settings/profile-pic', { profilePic });
}

// Editable profile details. Identity fields (email, CNIC, card) are locked
// after signup and are rejected by the backend if sent.
async function updateProfile(fields) {
  return api.patch('/auth/settings/profile', fields);
}

// Changing the password signs out every other device.
async function changePassword(currentPassword, newPassword) {
  return api.post('/auth/settings/password', { currentPassword, newPassword });
}

// Confirm the password before asking for anything else (e.g. a fingerprint).
// Throws { code: 'BAD_PASSWORD' } on a mismatch — the caller shows it inline.
async function verifyPassword(password) {
  return api.post('/auth/settings/verify-password', { password });
}

// Enable/disable biometric. To enable: pass { enabled:true, password, fingerprintHash }.
async function setBiometric({ enabled, password, fingerprintHash }) {
  return api.post('/auth/settings/biometric', { enabled, password, fingerprintHash });
}

// Feedback is stored, not just logged. Platform and version travel with it so
// a bug report is actionable without a follow-up question.
async function submitRating({ rating, category, comment, appVersion, platform }) {
  return api.post('/auth/settings/rating', { rating, category, comment, appVersion, platform });
}

export default {
  getSettings, updatePreferences, updateProfilePic, updateProfile,
  changePassword, verifyPassword, setBiometric, submitRating,
};
