# SehatLine — Deployment Guide

Ship the app: **MongoDB Atlas** (database) → **Render** (backend) → **EAS Build** (Android APK).

The steps that need YOUR login are marked 🔑 (I can't sign into your accounts). Everything
else is already configured in the repo.

---

## 1. 🔑 MongoDB Atlas (database)

1. Go to https://cloud.mongodb.com → sign in / sign up (free).
2. **Create a free cluster**: Build a Database → **M0 Free** → provider **AWS**, region closest
   to Singapore/Mumbai → Create.
3. **Database user**: Security → Database Access → Add New User → username `sehatline`, set a
   password (save it) → role **Read and write to any database**.
4. **Network access**: Security → Network Access → Add IP Address → **Allow access from anywhere
   (0.0.0.0/0)** (Render's IPs are dynamic). Confirm.
5. **Connection string**: Database → Connect → **Drivers** → copy the URI. It looks like:
   ```
   mongodb+srv://sehatline:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<password>` with your user's password, and insert the DB name `SehatLineApp` before
   the `?`:
   ```
   mongodb+srv://sehatline:YOURPASS@cluster0.xxxxx.mongodb.net/SehatLineApp?retryWrites=true&w=majority
   ```
   Keep this — it's your `MONGO_URI`.

6. **Seed the database** (creates the admin/doctor/pharmacy/lab logins + demo data). From your PC:
   ```bash
   cd backend
   MONGO_URI="<your Atlas URI from step 5>" npm run seed
   ```
   (On Windows PowerShell: `$env:MONGO_URI="..."; npm run seed`)

---

## 2. Push the code to GitHub (required for Render)

There's no git repo yet. From the project root (`D:\SehatLineApp`):

```bash
git init
git add .
git commit -m "Deploy: backend + app"
```

Then create an empty repo on github.com and push (🔑 uses your GitHub login):

```bash
git branch -M main
git remote add origin https://github.com/<you>/sehatline.git
git push -u origin main
```

`.gitignore` already excludes `node_modules`, `.env`, uploads, and logs, so no secrets are pushed.

---

## 3. 🔑 Render (backend)

The repo already contains `backend/render.yaml` (a Blueprint), so Render configures itself.

1. Go to https://dashboard.render.com → sign in / sign up.
2. **New → Blueprint** → connect your GitHub → pick the `sehatline` repo → Apply.
   Render reads `backend/render.yaml` and creates the **sehatline-backend** web service
   (build `npm install`, start `node server.js`, health check `/api/health`).
3. **Set the secret env var**: open the service → **Environment** → set
   - `MONGO_URI` = your Atlas connection string from step 1.5
   - (`JWT_SECRET` is auto-generated; `NODE_ENV=production` and `ML_AUTOSTART=false` are preset.)
   - (Optional) `EMAIL_USER` + `EMAIL_APP_PASSWORD` for password-reset emails.
4. **Deploy** → wait for "Live". Your URL is shown at the top, e.g.
   `https://sehatline-backend.onrender.com`.
5. **Verify**: open `https://<your-service>.onrender.com/api/health` in a browser — you should see
   a small JSON health response.

> **Free-plan caveat:** the free service **sleeps after ~15 min idle** (first request then takes
> ~50s to wake), and while asleep the live queue sockets drop and the 2 PM auto-backup cron won't
> fire. For a real clinic, upgrade this service to **Starter ($7/mo)** so it stays always-on.

---

## 4. Point the app at your backend

Open `frontend/src/config/api.config.js`:
- `USE_PRODUCTION` is already **`true`** (the APK will use the hosted backend).
- Set `PRODUCTION_API_URL` to your **actual** Render URL from step 3.4 (no trailing slash).
  It defaults to `https://sehatline-backend.onrender.com` — change it only if Render gave a
  different name/suffix.

---

## 5. 🔑 Build the Android APK (EAS)

`eas.json` is already set: the **preview** profile outputs a standalone **APK**.

```bash
cd frontend
npm install -g eas-cli        # once, if you don't have it
eas login                     # 🔑 your Expo account (free — expo.dev)
eas build -p android --profile preview
```

- First run asks to create the EAS project — say **yes** (it auto-fills the project id in
  `app.json`).
- The build runs on Expo's cloud (~10-20 min). When done, the terminal prints a **download link**
  for the `.apk` — install it on any Android phone (enable "install from unknown sources").

To rebuild after changes: bump `version` in `app.json` (optional) and re-run the `eas build`
command.

---

## Order matters
Atlas (1) → seed (1.6) → GitHub (2) → Render + set MONGO_URI (3) → confirm URL in app (4) →
build APK (5). The APK is useless until the backend is live, so deploy the backend first.

## Known limitations to verify on the built APK
- **Push notifications** need Android FCM credentials configured in EAS; without them, in-app
  notifications still work but remote push may not. (Non-blocking.)
- **Icons**: `expo-font` is now installed (it was the missing piece that caused icons to fail
  outside Expo Go), and `expo-doctor` passes 18/18. Icons should render in the APK; if any single
  one is still missing, tell me and I'll switch that screen's import to `@expo/vector-icons`.
- **iOS**: this guide is Android/APK. iOS needs an Apple Developer account ($99/yr) and
  `eas build -p ios`.
