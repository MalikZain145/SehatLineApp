// ============================================================
// Auth service (frontend)
// All calls the auth screens make. Screens import from here so
// networking stays out of the UI.
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../services/apiClient';

const USER_KEY = 'userData';

// ---- Signup (patient) ----
async function signup(payload) {
  // payload: { name, email, password, phone, cnic, cdaCard, dob, address,
  //            cnicFrontImage, cnicBackImage, cnicVerified, fingerprintHash? }
  const data = await api.post('/auth/signup', payload);
  if (data.token) await api.saveToken(data.token);
  if (data.user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

// ---- Login (any role) ----
async function login({ emailOrPhone, password, fingerprintHash }) {
  const data = await api.post('/auth/login', { emailOrPhone, password, fingerprintHash });
  if (data.token) await api.saveToken(data.token);
  if (data.user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

// ---- Fingerprint enrol (after normal login, on this device) ----
async function enrollFingerprint(fingerprintToken) {
  return api.post('/auth/enroll-fingerprint', { fingerprintToken });
}

// ---- Fingerprint login ----
async function fingerprintLogin({ fingerprintToken, email }) {
  const data = await api.post('/auth/fingerprint-login', { fingerprintToken, email });
  if (data.token) await api.saveToken(data.token);
  if (data.user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

// ---- CNIC real-time verify (multipart image upload) ----
// imageUri = local file uri from the camera. side = 'front' | 'back'
// userData = { cnic, name, dob } sent with the FRONT image so the backend
// can match the entered data against the CNIC image.
async function verifyCnic(imageUri, side, userData = {}) {
  const form = new FormData();
  form.append('side', side);
  form.append('image', {
    uri: imageUri,
    name: `cnic-${side}.jpg`,
    type: 'image/jpeg',
  });
  if (side === 'front') {
    if (userData.cnic) form.append('cnic', userData.cnic);
    if (userData.name) form.append('name', userData.name);
    if (userData.dob) form.append('dob', userData.dob);
    // Sent so the backend can reject a CDA card that's already registered.
    if (userData.cdaCard) form.append('cdaCard', userData.cdaCard);
  }
  return api.postForm('/auth/cnic/verify', form);
}

// ---- Early duplicate check (email / cnic / phone / card) ----
async function checkAvailability(fields) {
  // fields: { email?, cnic?, phone?, cdaCard? }
  return api.post('/auth/check-availability', fields);
}

// ---- Forgot password ----
async function requestReset({ email, phone }) {
  return api.post('/auth/forgot/request', { email, phone });
}
async function verifyReset({ email, phone, otp }) {
  return api.post('/auth/forgot/verify', { email, phone, otp });
}
async function resetPassword({ email, phone, resetTicket, newPassword }) {
  return api.post('/auth/forgot/reset', { email, phone, resetTicket, newPassword });
}

// ---- Session ----
async function me() {
  return api.get('/auth/me');
}
async function heartbeat() {
  return api.get('/auth/heartbeat');
}
const PUSH_TOKEN_KEY = 'expo_push_token';

// Register this device's Expo push token with the backend so notifications
// arrive while the app is closed. Best-effort.
async function registerPushToken(token) {
  if (!token) return;
  try { await AsyncStorage.setItem(PUSH_TOKEN_KEY, token); } catch (_) {}
  return api.post('/auth/push-token', { pushToken: token });
}

async function removePushToken() {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) await api.post('/auth/push-token/remove', { pushToken: token });
  } catch (_) {}
}

async function logout() {
  try {
    // Tell the server to stop pushing to THIS device on sign-out.
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    await api.post('/auth/logout', token ? { pushToken: token } : {});
  } catch (_) {
    // ignore — we clear locally regardless
  }
  await api.clearToken();
  await AsyncStorage.removeItem(USER_KEY);
}

// First-login forced password change (staff created with the shared default).
async function forcePasswordChange(newPassword) {
  return api.post('/auth/settings/force-password', { newPassword });
}

export default {
  signup,
  login,
  checkAvailability,
  enrollFingerprint,
  fingerprintLogin,
  verifyCnic,
  requestReset,
  verifyReset,
  resetPassword,
  me,
  heartbeat,
  logout,
  forcePasswordChange,
  registerPushToken,
  removePushToken,
  USER_KEY,
};
