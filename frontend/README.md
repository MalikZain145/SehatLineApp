# SehatLine — Frontend (Expo / React Native)

The mobile app. Includes the full **auth flow** wired to the backend:
Welcome -> Login / Signup / Forgot Password -> role portals, with fingerprint
login, camera-only CNIC capture with real-time verification, and automatic
logout on inactivity or biometric mismatch.

Works on **Android and iOS** (Expo SDK 54 — pinned to the exact versions your
main SehatLine project uses, so there are no version-mismatch errors).

---

## 1. Quick Start

```bash
cd frontend
npm install --legacy-peer-deps
# Point the app at your backend (see section 2), then:
npx expo start -c
```

> `--legacy-peer-deps` is needed because React 19 packages have strict peer
> ranges. `-c` clears the Metro cache (do this the first time).

Then press `a` (Android emulator), `i` (iOS simulator), or scan the QR code with
**Expo Go** on a real phone.

> Start the **backend first** (`cd backend && npm start`). The app needs it.

---

## 2. Point the App at the Backend  (IMPORTANT)

Edit **`src/config/api.config.js`** and set `LAN_IP`:

- **Real phone (Expo Go):** use your PC's LAN IP — the backend prints it as the
  **Network** URL on boot (e.g. `http://192.168.1.100:5000`). Phone + PC must be
  on the **same Wi-Fi**.
- **Android emulator:** set the host to `10.0.2.2`.
- **iOS simulator:** set the host to `localhost`.

```js
const LAN_IP = '192.168.1.100'; // <-- replace with the IP the backend prints
```

Also set `INACTIVITY_LIMIT_MS` to match the backend's
`SESSION_INACTIVITY_MINUTES` (default 5 minutes).

---

## 3. Native Features & Permissions

These are already declared in `app.json`:

- **Camera** — CNIC capture (camera only, no gallery).
- **Fingerprint / Face ID** — biometric login (`expo-local-authentication`).
- **Secure Store** — stores the device biometric token securely.

Packages used: `expo-image-picker`, `expo-local-authentication`,
`expo-secure-store`, `expo-crypto`, `react-native-reanimated`,
`@react-navigation/*`, `@react-native-async-storage/async-storage`.

> If you use a **development build** instead of Expo Go, run
> `npx expo prebuild` and rebuild after changing native permissions.

---

## 4. Auth Flow Summary

- **Signup (patients only):** 3 steps — personal info -> CNIC capture -> done.
  The CNIC step captures with the camera and sends each image to the backend for
  **real-time CNIC detection**; non-CNIC photos are rejected. On completion it
  calls the backend signup and logs the patient in.
- **Login (any role):** email/phone + password. Routes each role to its portal.
  Staff use the **seeded credentials** (see backend README).
- **Fingerprint login:** prompts the device biometric, then logs in the bound
  account. A different person's biometric fails at the OS level -> no login.
- **Forgot password:** email **or** phone -> OTP (sent via email/SMS) -> verify
  -> set new password. (CNIC option removed.)
- **Auto-logout:** an app-wide inactivity timer + server heartbeat log the user
  out after inactivity or if the server rejects the session (expired / biometric
  mismatch).

Errors surface as a **bottom fade-in/out toast** (`BottomErrorToast`) with clean
text and no heavy background block.

---

## 5. Folder Structure

```
frontend/
├── App.js                     # entry: navigation + session provider + activity wrapper
├── app.json                   # Expo config (camera + biometric permissions)
├── babel.config.js            # includes reanimated plugin
├── assets/                    # app icon / splash (logo.png)
└── src/
    ├── assets/logo.png        # logo used inside screens
    ├── config/api.config.js   # <-- set your backend IP here
    ├── constants/             # roles, role->route map, storage keys
    ├── theme/index.js         # COLORS / SIZES / SHADOWS / FONTS
    ├── navigation/            # RootNavigator (auth + role portals)
    ├── context/               # SessionContext (auto-logout, heartbeat)
    ├── services/              # apiClient (fetch + token + fingerprint header)
    ├── components/common/     # BottomErrorToast, ActivityWrapper
    ├── utils/biometric.js     # fingerprint helper
    └── modules/
        └── auth/
            ├── screens/       # Welcome, Login, Signup, ForgotPassword, PortalSelection
            └── services/      # authService (all auth API calls)
```

Other role modules (patient, doctor, admin, laboratory, pharmacy) follow the same
per-module `screens / components / services / hooks` pattern — build them the
same way and mirror each one in the backend.

---

## 6. Notes

- The logo is the **real SehatLine logo** taken from your main project
  (`assets/logo.png` and `src/assets/logo.png`).
- Some screens still contain old AsyncStorage helper functions from the original
  mock; they're harmless and unused now that auth is wired to the backend. You can
  delete them at your leisure.
