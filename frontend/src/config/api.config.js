// ============================================================
// API configuration — AUTO-DETECTS your backend IP.
// ------------------------------------------------------------
// You do NOT need to set any IP manually.
//
// How it works:
//   • When you run `npx expo start`, your phone connects to the Expo dev
//     server running on your PC. Expo exposes that PC's IP address.
//   • The backend runs on the SAME PC, so we reuse that IP automatically.
//   • If your Wi-Fi/IP changes, it just works — nothing to edit.
//
// For a shared APK (friends on any network) set USE_PRODUCTION = true and
// put your hosted backend URL in PRODUCTION_API_URL.
// ============================================================

import Constants from 'expo-constants';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---- Production (hosted) backend, used only when USE_PRODUCTION = true ----
// IMPORTANT: this must match your ACTUAL Render service URL. If you name the
// Render service "sehatline-backend" the URL is exactly the one below; if Render
// gave a different name/suffix, paste that full https URL here (no trailing /).
const PRODUCTION_API_URL = 'https://sehatlineapp1-9x00bewm.b4a.run';
// TRUE so the shipped APK talks to the hosted backend (not a dev LAN IP).
// Flip back to false for local development against your PC's backend.
const USE_PRODUCTION = true;

const LOCAL_PORT = 5000;

// ---- Manual backend override (highest priority) ----
// Point the app at ANY backend IP without touching auto-detection. Either:
//   • set EXPO_PUBLIC_API_URL=http://192.168.1.11:5000  (full URL), or
//   • set EXPO_PUBLIC_API_IP=192.168.1.11               (just the IP), in
//     frontend/.env, then restart Expo, OR
//   • hard-code MANUAL_API_IP below (e.g. '192.168.1.11').
// Leave MANUAL_API_IP empty to fall back to auto-detection.
const MANUAL_API_IP = '';

function manualBaseUrl() {
  const url = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  if (url) return url.replace(/\/+$/, '') + (url.endsWith('/api') ? '' : '/api');
  const ip = (process.env.EXPO_PUBLIC_API_IP || MANUAL_API_IP || '').trim();
  if (ip) return `http://${ip}:${LOCAL_PORT}/api`;
  return null;
}

// Pull the dev-server host IP (e.g. "192.168.1.43") from whichever source is
// available on this platform/SDK. This is what makes the app work on ANY IP
// automatically — the backend runs on the same machine as Metro/Expo, so we
// reuse the machine's IP that the phone is already talking to.
function getDevServerIp() {
  const candidates = [
    // Most reliable across Expo Go AND dev/bare builds: Metro's bundle URL,
    // e.g. "http://192.168.1.43:8081/index.bundle?platform=android". This is
    // present whenever the app was loaded from a Metro dev server.
    NativeModules?.SourceCode?.scriptURL,

    // Expo-provided host fields (vary by SDK / Expo Go vs dev client).
    Constants.expoGoConfig?.debuggerHost,          // newer Expo Go
    Constants.expoGoConfig?.hostUri,
    Constants.expoConfig?.hostUri,                 // SDK 49+
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.manifest2?.launchAsset?.url,
    Constants.manifest?.debuggerHost,              // legacy
    Constants.manifest?.hostUri,
    Constants.linkingUri,
    Constants.experienceUrl,
  ].filter(Boolean);

  for (const c of candidates) {
    // c looks like "192.168.1.43:8081", "exp://192.168.1.43:8081" or a full URL.
    const match = String(c).match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    // Ignore loopback (0.0.0.0 / 127.x) — those never reach a phone.
    if (match && match[1] !== '0.0.0.0' && !match[1].startsWith('127.')) {
      return match[1];
    }
  }
  return null;
}

function resolveBaseUrl() {
  // 1) Manual override wins — point at any backend IP you like.
  const manual = manualBaseUrl();
  if (manual) return manual;

  if (USE_PRODUCTION) {
    return `${PRODUCTION_API_URL}/api`;
  }

  // Auto-detected local IP (the PC running Expo + the backend).
  const ip = getDevServerIp();
  if (ip) {
    return `http://${ip}:${LOCAL_PORT}/api`;
  }

  // Fallbacks if detection fails:
  //  • Android emulator reaches the host machine at 10.0.2.2
  //  • otherwise localhost (iOS simulator / web)
  if (Platform.OS === 'android') return `http://10.0.2.2:${LOCAL_PORT}/api`;
  return `http://localhost:${LOCAL_PORT}/api`;
}

// Initial / fallback base URL (used until the remote config loads, and if it
// can't be fetched). `let` so live-binding importers see the refreshed value.
let _resolvedBase = resolveBaseUrl();
export let API_BASE_URL = _resolvedBase;

// The CURRENT backend URL is published to a tiny JSON file on GitHub, and the
// app reads it at startup. This means if the backend ever moves (new host, new
// URL), we just edit that one file and every installed APK picks it up — no
// rebuild ever needed again.
// Config sources, tried in order. The GitHub API (raw media type) is served
// FRESH — no CDN cache — so a just-published tunnel URL is picked up within
// seconds. raw.githubusercontent (which caches ~5 min) is only the fallback.
const CONFIG_SOURCES = [
  { url: 'https://api.github.com/repos/MalikZain145/SehatLineApp/contents/backend-url.json?ref=main', sep: '&', headers: { Accept: 'application/vnd.github.raw', 'User-Agent': 'SehatLine-App' } },
  { url: 'https://raw.githubusercontent.com/MalikZain145/SehatLineApp/main/backend-url.json', sep: '?', headers: {} },
];
const API_BASE_CACHE_KEY = '@sehatline_api_base';

function normalizeBase(url) {
  const u = String(url || '').trim().replace(/\/+$/, '');
  if (!u || !/^https?:\/\//i.test(u)) return null;
  return u.endsWith('/api') ? u : `${u}/api`;
}

// Whatever the dynamic resolver last settled on. apiClient/socket read this.
export function getApiBaseUrl() {
  return _resolvedBase;
}

// Run ONCE at app startup, before the first API call. Uses the cached URL
// instantly, then refreshes from the GitHub config in the background.
export async function bootstrapApiBaseUrl() {
  // 1) Instant: last known good URL from cache.
  try {
    const cached = await AsyncStorage.getItem(API_BASE_CACHE_KEY);
    if (cached) { _resolvedBase = cached; API_BASE_URL = cached; }
  } catch (e) { /* ignore */ }
  // 2) Fresh: the current tunnel URL published on GitHub. Try the uncached API
  // first, then the raw CDN, each with a hard timeout so a slow/unreachable
  // GitHub never blocks app startup.
  for (const src of CONFIG_SOURCES) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${src.url}${src.sep}t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', ...src.headers },
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        // Read as text and strip a leading BOM before parsing — some hosts
        // prefix the file with a BOM, which makes JSON.parse throw.
        let raw = await res.text(); if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); raw = raw.trim();
        const j = JSON.parse(raw);
        const base = normalizeBase(j && j.apiBaseUrl);
        if (base) {
          _resolvedBase = base;
          API_BASE_URL = base;
          try { await AsyncStorage.setItem(API_BASE_CACHE_KEY, base); } catch (e) { /* ignore */ }
          break; // got a fresh URL — stop trying sources
        }
      }
    } catch (e) { /* try the next source */ }
  }
  console.log('[SehatLine] API base URL →', _resolvedBase);
  return _resolvedBase;
}

// Session heartbeat interval (ms).
export const HEARTBEAT_INTERVAL_MS = 60 * 1000;

// Client-side inactivity limit (ms) — matches backend SESSION_INACTIVITY_MINUTES.
export const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;

export default { API_BASE_URL, HEARTBEAT_INTERVAL_MS, INACTIVITY_LIMIT_MS };
