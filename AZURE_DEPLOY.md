# Deploy the backend on Azure for Students (free, no card, always-on)

You do the 🔑 login/click steps (I can't sign in as you). The repo is already
Azure-ready (root `package.json` runs the backend; Node pinned to 20).

---

## 1. 🔑 Activate Azure for Students (no card)
1. Go to **https://azure.microsoft.com/free/students**
2. Click **Start free / Activate** → sign in with your **university email**.
3. Verify (it confirms you're a student from the email). You get **$100 credit + free services, no card**.

## 2. 🔑 Create the Web App
Azure Portal → **Create a resource** → **Web App**:
- **Name:** `sehatline-backend` (if taken, add digits → your URL becomes `<name>.azurewebsites.net`)
- **Publish:** Code
- **Runtime stack:** **Node 20 LTS**
- **Operating System:** **Linux**
- **Region:** Central India (or nearest)
- **Pricing plan:** **B1 Basic** (needed for always-on; ~$13/mo from your $100 credit ≈ 7 months free). *You can start on Free F1 to test, but F1 sleeps and has no "Always On".*
- **Review + Create** → **Create**.

## 3. 🔑 Configure it (before/right after deploy)
Open the Web App → **Settings → Configuration**:

**Application settings** (→ New application setting, add each):
| Name | Value |
|---|---|
| `MONGO_URI` | `mongodb+srv://mzainulabideen918_db_user:Zain123987101@cluster0.dmhkpnp.mongodb.net/SehatLineApp?retryWrites=true&w=majority` |
| `JWT_SECRET` | `77a957248ed9dee7143a139470df4a16d922d7ec3c8a196fcedf7f225b472567a93498dd489c5d4209a07a40ec070436` |
| `ML_AUTOSTART` | `false` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |

**General settings** (same Configuration page):
- **Web sockets:** **On**  (needed for the live queue / socket.io)
- **Always on:** **On**  (B1+; keeps it running 24/7)
- **Startup Command:** `npm start`

Click **Save**.

## 4. 🔑 Deploy from GitHub
Web App → **Deployment Center**:
- **Source:** GitHub → authorize → **Org:** MalikZain145, **Repo:** SehatLineApp, **Branch:** main
- **Build provider:** GitHub Actions (default) → **Save**.
- Azure commits a workflow and runs the first deploy (watch it under the repo's **Actions** tab or Deployment Center logs; ~3–6 min).

## 5. Verify
Open in a browser: `https://<your-app-name>.azurewebsites.net/api/health`
→ expect `{"success":true,"service":"SehatLine API",...}`

## 6. Point the app + final APK build
Once health works, tell me the URL. I'll:
- set `backend-url.json` → your Azure URL and push,
- then you run the final `eas build -p android --profile preview`.

After that: **deploy-once, always-on, works without your PC.** 🎉

## Atlas reminder
Atlas → **Network Access** must include **`0.0.0.0/0`** so Azure can connect.
