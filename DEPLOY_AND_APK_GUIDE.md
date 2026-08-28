# SehatLine — Host Backend + Build APK (Step by Step)

Goal: put the database + backend online (free), then build an installable
**APK** you can send to friends. Three free services:

1. **MongoDB Atlas** — cloud database (free)
2. **Render.com** — hosts the backend (free)
3. **EAS Build** — builds the APK in the cloud (free)

Do them in order. Total time ~30–40 min (mostly waiting).

---

## PART 1 — Database on MongoDB Atlas (free)

1. Go to https://www.mongodb.com/atlas → **Sign up** (free).
2. Create a **free M0 cluster** (pick any cloud/region near you).
3. **Database Access** (left menu) → **Add New Database User**:
   - Username: `sehatline`  ·  Password: choose one (save it!)
   - Role: **Read and write to any database** → Add User.
4. **Network Access** (left menu) → **Add IP Address** →
   **Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm.
   (Render's servers need this.)
5. **Database** → **Connect** → **Drivers** → copy the connection string. Looks like:
   ```
   mongodb+srv://sehatline:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Edit it: replace `<password>` with your real password, and add the DB name
   **SehatLineApp** right before the `?`:
   ```
   mongodb+srv://sehatline:YOURPASS@cluster0.xxxxx.mongodb.net/SehatLineApp?retryWrites=true&w=majority
   ```
   Save this final string — you'll paste it into Render as `MONGO_URI`.

---

## PART 2 — Backend on Render.com (free)

Render deploys from a Git repo, so first put your code on GitHub.

### 2a) Push to GitHub
1. Create a **new GitHub repo** (e.g. `sehatline`).
2. In your project folder:
   ```bash
   cd "D:\Sehat Line App"
   git init
   git add .
   git commit -m "SehatLine app"
   git branch -M main
   git remote add origin https://github.com/USERNAME/sehatline.git
   git push -u origin main
   ```
   (Make sure `node_modules` and `.env` are NOT pushed — the `.gitignore`
   files already handle this.)

### 2b) Create the Render service
1. Go to https://render.com → **Sign up** (use GitHub login).
2. **New +** → **Web Service** → connect your `sehatline` repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. **Environment** → add these variables (click "Add Environment Variable"):

   | Key | Value |
   |---|---|
   | `MONGO_URI` | the Atlas string from Part 1 |
   | `JWT_SECRET` | run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and paste |
   | `NODE_ENV` | `production` |
   | `SESSION_INACTIVITY_MINUTES` | `5` |
   | `EMAIL_USER` | your gmail (optional, for OTP email) |
   | `EMAIL_APP_PASSWORD` | gmail app password (optional) |
   | `EMAIL_FROM` | `SehatLine <youremail@gmail.com>` (optional) |

5. **Create Web Service**. Wait for it to build (~3–5 min). When done you'll get
   a URL like:
   ```
   https://sehatline-backend.onrender.com
   ```
6. Test it: open `https://sehatline-backend.onrender.com/api/health` in a
   browser → you should see `{"success":true,...}`.

7. **Seed the staff accounts** (doctors/admin/lab/pharmacy). Easiest way:
   in Render, open your service → **Shell** tab → run:
   ```bash
   npm run seed
   ```
   You'll see the seeded accounts table (credentials are in backend/README.md).

> ⚠️ Free Render services **sleep after 15 min idle**. The first request after
> sleeping takes ~30–50 sec to wake up (the app may show a slow first load).
> That's normal on the free tier.

---

## PART 3 — Point the app at the hosted backend

1. Open `frontend/src/config/api.config.js`.
2. Set your Render URL and keep production mode on:
   ```js
   const PRODUCTION_API_URL = 'https://sehatline-backend.onrender.com';
   const USE_PRODUCTION = true;
   ```
   (Use YOUR Render URL. No trailing slash, no `/api`.)
3. Save.

---

## PART 4 — Build the APK with EAS (free)

1. Create a free **Expo account**: https://expo.dev → Sign up.
2. Install the EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
3. In the frontend folder:
   ```bash
   cd "D:\Sehat Line App\frontend"
   eas login
   ```
   (log in with your Expo account)
4. Link the project (first time only):
   ```bash
   eas init
   ```
   Accept creating a new project when prompted.
5. Build the APK:
   ```bash
   eas build --platform android --profile preview
   ```
   - It uploads your code and builds in the cloud (~10–20 min).
   - When done, it prints a **download link** for the `.apk`.
6. Open that link → download the APK → send it to friends (WhatsApp, Drive, etc.).

### Installing on a friend's phone
- They tap the APK to install.
- Android will warn "install from unknown sources" → they allow it for the
  browser/file app → install.
- Open the app. Because the backend is hosted, **everything works from any
  network** (no need to be on your Wi-Fi).

---

## Quick recap of what each part gives you

- **Atlas** → the database lives online, so data persists and is shared.
- **Render** → the backend runs online, reachable from any phone.
- **api.config.js** (`USE_PRODUCTION = true`) → the app talks to the hosted backend.
- **EAS** → turns the app into an APK your friends can install.

---

## Common issues

- **APK app can't reach backend** → check `PRODUCTION_API_URL` is your exact
  Render URL and `USE_PRODUCTION = true`, then rebuild the APK.
- **First load very slow** → Render free tier was asleep; wait ~40 sec.
- **OTP email not arriving** → set `EMAIL_USER` + `EMAIL_APP_PASSWORD` in Render.
  Until then the OTP is printed in the Render **Logs** tab.
- **Login says "no account"** → run `npm run seed` in the Render Shell to create
  staff accounts; patients must sign up in the app.
- **CNIC verify slow on first try** → the OCR model downloads once on the server;
  subsequent verifies are faster.

---

## Going back to local dev later

To develop on your own Wi-Fi again, set in `api.config.js`:
```js
const USE_PRODUCTION = false;
const LAN_IP = '192.168.1.10'; // your PC IP the backend prints
```
and run the backend locally with `npm start`.
