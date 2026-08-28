# SehatLine App

Full-stack healthcare application for CDA Hospital, Islamabad.

- **frontend/** — Expo (React Native) mobile app — Android + iOS
- **backend/** — Node/Express + MongoDB API

This build delivers the **complete authentication system** (the `auth` module in
both frontend and backend). The other modules — `patient`, `doctor`, `admin`,
`laboratory`, `pharmacy` — are scaffolded with the same folder pattern, ready to
build next.

---

## Setup (do this in order)

### 1) Backend
```bash
cd backend
npm install
cp .env.example .env      # edit it (MongoDB URI, JWT secret, Gmail app password)
npm run seed              # create staff accounts (doctors, admin, lab, pharmacy)
npm start
```
The backend prints a **Network URL** (your PC's LAN IP) on boot — copy it.

### 2) Frontend
```bash
cd frontend
npm install
# open src/config/api.config.js and set LAN_IP to the backend's Network URL IP
npx expo start
```
Scan the QR with **Expo Go**, or press `a` / `i` for emulator/simulator.

> Full details are in **backend/README.md** and **frontend/README.md**.
> **Staff login credentials** are listed in **backend/README.md** (section 4).

---

## What's implemented

- **Patient signup** — 3-step form; CNIC captured with **camera only** and
  verified in **real time** (OCR confirms it's actually a CNIC).
- **Role-based login** — patient / doctor / admin / laboratory / pharmacy.
  Staff are **seeded** (they don't sign up); patients sign up in the app.
- **Fingerprint login** with **device binding** — a different fingerprint logs
  the app out.
- **Sessions** — JWT + server-side sessions, **auto-logout on inactivity**, and
  IP logging (the terminal shows where each request comes from).
- **Forgot password** — email **or** phone -> **OTP** (email + free SMS) ->
  reset, with a **"password changed" confirmation email**. (CNIC removed.)
- **Database** — MongoDB `Sehat Line App`; the **schema prints in the terminal**
  on boot; signup data is saved to the DB.
- **Errors** — clean **bottom fade-in/out** toast, no heavy background.
- **Theme/style preserved** exactly from the provided screens (teal / mint / slate).

---

## The mirror rule (frontend <-> backend)

Both sides share the **same module names**. When you build a feature file in a
frontend module, create its matching file in the **same backend module**, so
every screen has a clear backend counterpart.

```
frontend/src/modules/<module>/screens|components|services|hooks
backend/src/modules/<module>/models|controllers|routes|services|validations
```

Modules: `auth` (done) · `patient` · `doctor` · `admin` · `laboratory` · `pharmacy`
