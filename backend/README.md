# SehatLine — Backend (Auth Module)

Node/Express + MongoDB backend for the SehatLine healthcare app.
This delivers the **complete authentication system**: patient signup, role-based
login, biometric (fingerprint) login with device binding, session management with
inactivity auto-logout, real-time CNIC detection, and an email/SMS OTP
forgot-password flow.

---

## 1. Quick Start

```bash
cd backend
npm install
cp .env.example .env      # then edit .env (see section 3)
npm run seed              # create the hardcoded staff accounts (doctors, admin, lab, pharmacy)
npm start                 # or: npm run dev   (auto-reload with nodemon)
```

On boot the terminal shows:
- MongoDB connection (database name + host)
- the full **database schema** (every collection + field + type)
- the server URLs, including a **Network URL** (your PC's LAN IP) —
  use that exact URL in the app when testing on a real phone.

You also get **live access logs** for every request: `METHOD /path from <IP>`,
and **DB operation logs**: `DB INSERT users patient john@x.com`, etc.

---

## 2. Requirements

- **Node.js 18+** (uses built-in `fetch` for SMS)
- **MongoDB** — either:
  - Local: install MongoDB Community, make sure the `mongod` service is running, or
  - Atlas (cloud): create a free cluster and use its connection string in `.env`.

Database name is **`Sehat Line App`** (set in `MONGO_URI`).

---

## 3. Environment Variables (`.env`)

Copy `.env.example` -> `.env` and fill it in. Key ones:

| Variable | What it's for |
|---|---|
| `MONGO_URI` | MongoDB connection (local or Atlas). DB name = `Sehat Line App`. |
| `JWT_SECRET` | Secret for signing login tokens. Generate a long random string. |
| `SESSION_INACTIVITY_MINUTES` | Auto-logout after this many minutes idle (default 5). |
| `EMAIL_USER` / `EMAIL_APP_PASSWORD` | Gmail + **App Password** for sending OTP & reset emails. |
| `SMS_PROVIDER` / `SMS_TEXTBELT_KEY` | Free SMS for OTP (Textbelt). Optional — see below. |

### Generate a JWT secret
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Gmail App Password (for email OTP)
1. Enable **2-Step Verification** on the Gmail account.
2. Google Account -> Security -> **App passwords**.
3. Generate a 16-character password, paste into `EMAIL_APP_PASSWORD` (no spaces).

> If email isn't configured, the app still works: **the OTP is printed to the
> server terminal** so you can test the full flow.

### Free SMS (for phone OTP) — optional
Default provider is **Textbelt**. The key `textbelt` gives **1 free SMS/day**
(US numbers) for quick testing. For real Pakistani-number SMS you'd buy a key or
swap in another provider inside `src/services/sms.service.js`.

> If SMS isn't configured or fails, the OTP is **emailed and printed to the
> terminal**, so testing is never blocked.

---

## 4. Seeded Staff Accounts (LOGIN CREDENTIALS)

Patients **sign up** in the app. Staff **do not sign up** — they are seeded into
the database by `npm run seed`. Use these to log in as each role.

**Password for ALL seeded accounts:** `SehatLine@123`

| Role | Name | Email (login) |
|---|---|---|
| Doctor | Dr. Ayesha Khan | `dr.ayesha@sehatline.pk` |
| Doctor | Dr. Bilal Ahmed | `dr.bilal@sehatline.pk` |
| Admin | System Administrator | `admin@sehatline.pk` |
| Laboratory | Lab Tech - Sara Malik | `lab.sara@sehatline.pk` |
| Laboratory | Lab Tech - Usman Raza | `lab.usman@sehatline.pk` |
| Pharmacy | Pharmacist - Hina Shah | `pharma.hina@sehatline.pk` |
| Pharmacy | Pharmacist - Ali Nawaz | `pharma.ali@sehatline.pk` |

> **Change these passwords before any real deployment.** Edit
> `seed/seed.js` (the `STAFF` array and `DEFAULT_PASSWORD`) and re-run
> `npm run seed`. The seed is **idempotent** — re-running updates existing
> accounts instead of duplicating them.

To add more staff later, add entries to the `STAFF` array in `seed/seed.js`
and re-run the seed.

---

## 5. How the Key Features Work

### Sessions + inactivity auto-logout
- On login a **Session** document is created (stores IP, device fingerprint,
  last-activity time) and a JWT carrying the session id is returned.
- Every protected request refreshes `lastActivityAt`. If the gap exceeds
  `SESSION_INACTIVITY_MINUTES`, the next request is rejected with `401 INACTIVE`
  -> the app logs out. The app also runs a client-side inactivity timer and a
  periodic **heartbeat** so it logs out even while idle.

### Fingerprint login + device binding
- The app enrolls a device biometric token (hashed). It's stored on the user and
  the session.
- If a request arrives whose fingerprint hash **differs** from the session's, the
  server rejects it (`401 FINGERPRINT_MISMATCH`) -> logout. So if **someone
  else's fingerprint** is used, the app logs out.

### Real-time CNIC detection (camera only)
- The signup CNIC step uses the **camera only** (no gallery).
- Each captured image is POSTed to `/api/auth/cnic/verify`, which runs **OCR**
  (Tesseract) and checks for CNIC markers: the **13-digit identity number**
  pattern and Pakistani CNIC keywords ("Pakistan", "Identity Card", "Date of
  Birth", etc.). It returns a verdict + confidence, so the UI accepts or rejects
  the capture in real time. A random photo is rejected; a real CNIC is accepted.
- **Offline/production option:** bundle the OCR model and set `TESS_LANG_PATH`
  (see comments in `src/services/cnic.service.js`). Download once from
  `https://github.com/naptha/tessdata/raw/main/eng.traineddata` into
  `backend/tessdata/` and set `TESS_LANG_PATH=./tessdata`.

### Forgot password (email + phone, no CNIC)
1. `POST /forgot/request` — find the user by email **or** phone, generate a
   6-digit OTP (hashed, 10-min expiry), send via **email + SMS** (both fall back
   to terminal).
2. `POST /forgot/verify` — check the OTP, return a short-lived reset ticket.
3. `POST /forgot/reset` — set the new password, **send a "password changed"
   confirmation email**, and invalidate all existing sessions.

---

## 6. API Reference (base: `/api/auth`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/signup` | — | Patient signup (creates account + logs in) |
| POST | `/login` | — | Login (any role) with email/phone + password |
| POST | `/fingerprint-login` | — | Login using an enrolled fingerprint |
| POST | `/cnic/verify` | — | Upload CNIC image (multipart `image`, `side`) -> real-time verdict |
| POST | `/forgot/request` | — | Send OTP to email/phone |
| POST | `/forgot/verify` | — | Verify OTP -> returns `resetTicket` |
| POST | `/forgot/reset` | — | Reset password using `resetTicket` |
| GET | `/me` | yes | Current user |
| GET | `/heartbeat` | yes | Keep session alive / check validity |
| POST | `/enroll-fingerprint` | yes | Bind a fingerprint to this account/device |
| POST | `/logout` | yes | End the session |

Protected routes need headers:
`Authorization: Bearer <token>` and `x-fingerprint: <hash>`.

Health check: `GET /api/health`.

---

## 7. Folder Structure

```
backend/
├── server.js                 # entry: connect DB, print schema, start server
├── seed/seed.js              # hardcoded staff accounts (run: npm run seed)
├── uploads/                  # captured CNIC images are stored here
└── src/
    ├── app.js                # express app (middleware, routes, errors)
    ├── config/
    │   ├── env.js            # all env vars in one place
    │   └── db.js             # mongo connect + schema printer
    ├── middleware/
    │   ├── requestLogger.js  # logs IP + route for every request
    │   ├── auth.middleware.js# JWT + session + inactivity + fingerprint guard
    │   ├── role.middleware.js# restrict routes by role
    │   ├── upload.js         # multer (CNIC image upload)
    │   └── errorHandler.js   # consistent error responses
    ├── services/
    │   ├── email.service.js  # Gmail OTP + reset-success emails
    │   ├── sms.service.js    # Textbelt SMS OTP (+ terminal fallback)
    │   └── cnic.service.js   # OCR CNIC detection
    ├── utils/
    │   ├── jwt.js            # sign/verify tokens
    │   └── logger.js         # colored terminal logging
    └── modules/auth/
        ├── models/           # User, Session, PasswordReset
        ├── controllers/      # auth, cnic, password
        ├── routes/           # auth.routes.js
        ├── services/         # auth.service.js (session creation)
        └── validations/      # request validation
```

---

## 8. Notes

- **CORS** is open in development. Lock it to your app's origin for production.
- Passwords are hashed with **bcrypt**; OTPs are stored **hashed** with expiry.
- Rate limiting protects login and OTP endpoints.
- This is the **auth module**. Other modules (patient, doctor, admin, laboratory,
  pharmacy) follow the same folder pattern — build them the same way.
