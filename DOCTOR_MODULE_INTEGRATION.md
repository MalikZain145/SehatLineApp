# SehatLine — Doctor Module Integration (Production)

This document describes the Doctor module that was integrated into the SehatLine
app and how the full **Patient → Doctor → Pharmacy** flow works with the real
backend and the queueing-theory–based queue optimisation.

---

## 1. What the Doctor does (the required flow)

| Step | Screen | Backend |
|------|--------|---------|
| **Login** | `LoginScreen` (role auto-detected from email) | `POST /api/auth/login` |
| **Doctor Portal** | `DoctorPortalScreen` — greeting, Today's Overview, Today's Schedule, Start Session | `GET /api/doctor/dashboard` |
| **Today's Overview** | Today's Patients · Waiting · Completed (live) | `GET /api/doctor/dashboard` |
| **Today's Schedule** | OPD timing, break, room, on-duty doctors | `GET /api/doctor/dashboard` |
| **Live OPD Queue** | `TodayQueueScreen` / portal queue — token order by priority | `GET /api/doctor/queue` |
| **Consultation** | `CallNextPatientScreen` — patient history, diagnosis, clinical notes, prescription | `POST /api/doctor/consult/:id/start`, `GET /api/doctor/consult/:id` |
| **Proceed (one click)** | Saves prescription → sends patient to **Pharmacy** → auto-loads the next (highest-priority) patient | `POST /api/doctor/consult/:id/proceed` |
| **Notifications** | `DoctorNotificationsScreen` — important updates only (appointments, admin/system). Queue/token notifications are excluded. | `GET /api/doctor/notifications` |
| **Profile & Settings** | `DoctorProfileScreen`, `DoctorEditProfileScreen`, `DoctorSettingsScreen` | `GET/PATCH /api/doctor/profile` |
| **Logout** | Settings → Logout (ends the real server session) | `POST /api/auth/logout` |

### One-click **Proceed** (the key requirement)
`POST /api/doctor/consult/:tokenId/proceed` does everything atomically on the server:
1. Saves diagnosis + clinical notes on the token.
2. Creates a **Prescription** (medicines + lab tests + patient snapshot) with
   `pharmacyStatus: 'pending'` → this is what the patient/pharmacy sees.
3. Moves the token to **Pharmacy** (`department: 'pharmacy'`).
   *Follow-up (reports-only) visits are completed instead — no pharmacy.*
4. Auto-loads the next highest-priority waiting patient (`in-progress`) and
   notifies that patient it is their turn.

---

## 2. Queue optimisation (queueing theory)

Implemented in `backend/src/modules/patient/services/queueing.service.js` and
`priority.service.js`, following the M/M/s (Erlang C) model from *Queueing
Theory and Modeling* (Linda Green):

- **Server pooling** — ONE shared, priority-ordered OPD queue feeds every
  on-duty doctor. Whichever doctor is free pulls the next highest-priority
  patient. Pooling is the single biggest lever for cutting waiting time.
- **Priority ordering** — critical conditions first, then elderly (60+), then
  normal (FIFO within each band). Keeps the sickest waiting the least.
- **Live metrics** — utilisation (ρ), probability of waiting (Erlang C),
  average wait (Wq) and per-patient estimated wait, surfaced on the dashboard
  and each queue row.

---

## 3. Patient side

- The **doctor simulation buttons were removed** from `TokenJourneyScreen` — the
  real Doctor module now performs the consultation and the Proceed step.
- The patient sees the **real prescription** the doctor generated
  (`token.prescription.medicines`) once their token reaches Pharmacy.
- Pharmacy/Lab simulation buttons remain (those staff modules are not built yet).

---

## 4. Test / demo accounts (seeded)

All seeded passwords: **`SehatLine@123`**

- Doctor: `doctor@gmail.com` or `doctor@sehatline.com`
- Admin: `admin@sehatline.pk`
- (Patients: sign up normally, or use the seeded accounts in `backend/seed/seed.js`)

---

## 5. How to run

### Backend
```bash
cd backend
npm install
# Ensure MongoDB is running locally (mongodb://127.0.0.1:27017) or set MONGO_URI in .env
npm run seed        # seeds doctor/admin/patient accounts + medicines
npm start           # starts API on :5000
```

### Frontend (Expo)
```bash
cd frontend
npm install
npx expo start
```
The app auto-detects the backend IP from the Expo dev server — no manual IP
editing needed on the same Wi-Fi. (For a shared APK, set `USE_PRODUCTION` /
`PRODUCTION_API_URL` in `frontend/src/config/api.config.js`.)

> `node_modules` are **not** included in the zip — run `npm install` in both
> `backend/` and `frontend/` after unzipping.

---

## 6. Verified

The full doctor flow was verified end-to-end against an in-memory MongoDB
(22/22 checks): priority queue ordering, dashboard metrics, start consult,
consultation details, proceed → prescription → pharmacy → auto-load next →
notify next patient, and notification filtering.
