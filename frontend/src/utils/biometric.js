// ============================================================
// Biometric helper (fingerprint / Face ID)
// Uses expo-local-authentication. Produces a stable per-device token
// that we hash on the backend for device binding. If a DIFFERENT
// person's biometric is used, the OS authentication fails, so we never
// get a token → the app stays logged out / logs out.
//
// Requires: expo-local-authentication, expo-secure-store
//   npx expo install expo-local-authentication expo-secure-store
// ============================================================

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const DEVICE_TOKEN_KEY = 'sehatline_device_biometric_token';

// Is biometric hardware present AND enrolled?
export async function isBiometricAvailable() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

// Get (or create) a stable random token tied to this device+enrollment.
// Stored in SecureStore. We hand this token to the backend which hashes it.
async function getOrCreateDeviceToken() {
  let token = await SecureStore.getItemAsync(DEVICE_TOKEN_KEY);
  if (!token) {
    const random = Crypto.getRandomBytes(32);
    token = Array.from(random).map((b) => b.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(DEVICE_TOKEN_KEY, token);
  }
  return token;
}

// Prompt the fingerprint/face scan. Returns the device token on success.
// If the scan fails or is cancelled (e.g. wrong finger), returns null.
export async function authenticateBiometric(promptMessage = 'Confirm your identity') {
  const available = await isBiometricAvailable();
  if (!available) {
    return { success: false, error: 'NO_BIOMETRIC', message: 'No fingerprint enrolled on this device.' };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });

  if (!result.success) {
    return { success: false, error: 'AUTH_FAILED', message: 'Fingerprint not recognized.' };
  }

  const deviceToken = await getOrCreateDeviceToken();
  return { success: true, deviceToken };
}

// Produce the SHA-256 hash we also store locally for the x-fingerprint header.
export async function hashToken(token) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token);
}

export default { isBiometricAvailable, authenticateBiometric, hashToken };
