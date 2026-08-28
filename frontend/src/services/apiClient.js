// ============================================================
// API client
// A thin fetch wrapper that:
//   • prefixes API_BASE_URL
//   • attaches the JWT (Authorization: Bearer ...)
//   • attaches the device fingerprint hash (x-fingerprint) so the
//     backend can enforce device binding
//   • on any 401, clears the session and calls the registered
//     onUnauthorized handler → the app navigates to Login (auto-logout)
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../config/api.config';

const TOKEN_KEY = 'auth_token';
const FP_KEY = 'device_fingerprint_hash';

// The app registers a callback here (see SessionContext) so the client
// can force a logout/navigation when the server rejects the session.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function getFingerprint() {
  return AsyncStorage.getItem(FP_KEY);
}

async function request(path, { method = 'GET', body, headers = {}, isForm = false } = {}) {
  const token = await getToken();
  const fp = await getFingerprint();

  const finalHeaders = { ...headers };
  if (!isForm) finalHeaders['Content-Type'] = 'application/json';
  if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  if (fp) finalHeaders['x-fingerprint'] = fp;

  let res;
  // Abort the request if it takes too long, so the UI never gets stuck.
  // CNIC verify (OCR) needs longer than normal calls — the model is now
  // bundled server-side so OCR is a few seconds, but keep a generous margin
  // for slower phones/PCs.
  const timeoutMs = isForm ? 60000 : 20000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers: finalHeaders,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (networkErr) {
    clearTimeout(timeoutId);
    // Timeout or network / server unreachable
    if (networkErr.name === 'AbortError') {
      throw {
        code: 'TIMEOUT',
        message: 'The request took too long. Please try again.',
      };
    }
    throw {
      code: 'NETWORK',
      message: 'Cannot reach server. Check your connection and the API address.',
    };
  }

  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    data = {};
  }

  // A 401 means one of two very different things:
  //
  //   • The session is gone — expired, revoked, timed out. The app must
  //     return the user to the login screen.
  //   • The user typed the wrong password into a form on a screen they are
  //     legitimately signed in to. Signing them out for that is hostile: they
  //     lose their place, and the mistake they were about to correct.
  //
  // Only the first set of codes, all raised by the auth middleware, should
  // tear down the session.
  const SESSION_FAILURES = new Set([
    'NO_TOKEN', 'BAD_TOKEN', 'NO_SESSION', 'INACTIVE', 'NO_USER',
    'FINGERPRINT_MISMATCH_SESSION',
  ]);

  if (res.status === 401) {
    const code = data.code || 'UNAUTHORIZED';
    const isSessionFailure = SESSION_FAILURES.has(code) || !data.code;

    if (isSessionFailure) {
      await AsyncStorage.multiRemove([TOKEN_KEY]);
      // Don't trigger the global handler for the logout endpoint itself —
      // that loops.
      const isLogout = path.includes('/auth/logout');
      if (onUnauthorized && !isLogout) onUnauthorized(data);
      throw { code, message: data.message || 'Session ended.' };
    }

    // A form-level rejection. Hand it back to the caller to display.
    throw { code, message: data.message || 'Request failed', status: 401 };
  }

  if (!res.ok) {
    throw { code: data.code || 'ERROR', message: data.message || 'Request failed', status: res.status };
  }

  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  postForm: (path, formData, opts) =>
    request(path, { ...opts, method: 'POST', body: formData, isForm: true }),

  // token + fingerprint storage helpers
  saveToken: (t) => AsyncStorage.setItem(TOKEN_KEY, t),
  clearToken: () => AsyncStorage.removeItem(TOKEN_KEY),
  saveFingerprint: (h) => AsyncStorage.setItem(FP_KEY, h),
  getFingerprint,
  TOKEN_KEY,
  FP_KEY,
};

export default api;
