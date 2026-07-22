# Flow Wine Group — Client Portal

Monorepo: `backend` (Node/Express API + Postgres + Salesforce) and `frontend` (React/Vite).
Built API-first — the frontend is a browser SPA today, but every feature is a REST endpoint,
so a future mobile app can call the same `backend` without changes.

## 1. One-time local setup

```bash
# Backend
cd backend
cp .env.example .env      # fill in JWT_SECRET, DATABASE_URL, etc.
npm install
npm run migrate           # creates all tables in the target Postgres DB
npm run dev

# Frontend (new terminal)
cd frontend
cp .env.example .env      # point VITE_API_BASE_URL at the backend
npm install
npm run dev
```

Then in the Admin Panel (create your first admin row directly in Postgres — see below),
fill in **Salesforce Connection**, **SMTP Settings**, and **Claude Settings** before inviting clients.

### Creating the first admin user
The Users tab only syncs `role='client'` contacts from Salesforce. Create your first admin
manually, once:
```sql
INSERT INTO users (first_name, last_name, email, role, active, password_hash)
VALUES ('Admin', 'User', 'you@flowwinegroup.com', 'admin', true,
  '$2a$10$REPLACE_WITH_A_BCRYPT_HASH');
```
Generate a bcrypt hash with `node -e "console.log(require('bcryptjs').hashSync('yourpassword',10))"`.

## 2. Railway deployment

You said you're already running multiple apps on one Railway account with one Postgres —
here's how this fits in without disturbing anything else:

1. **Database**: in your existing Postgres plugin, create a **new database** for this app
   (`CREATE DATABASE fwg_portal;` via Railway's Postgres query console, or a new database
   inside the same instance). Use its connection string as `DATABASE_URL` for the backend
   service — don't reuse a database that already has tables from another project.
2. **GitHub**: push this repo to a new GitHub repo (e.g. `flowwinegroup-portal`). Railway
   deploys straight from GitHub on every push to `main`.
3. **Two Railway services in one Railway project**:
   - `fwg-portal-backend` → Root Directory: `backend` → env vars from `backend/.env.example`
   - `fwg-portal-frontend` → Root Directory: `frontend` → env vars from `frontend/.env.example`,
     with `VITE_API_BASE_URL` pointing at the backend service's Railway URL + `/api`
4. Railway auto-detects Node via `package.json` (Nixpacks) in each service; `railway.json`
   in each folder pins the build/start commands, including running migrations on deploy.

### Production vs Sandbox — running fully parallel (chosen setup)
Production and Sandbox run as two **completely separate, simultaneous** deployments — same
GitHub repo, same codebase, but never sharing a database or a Salesforce session:

| | Production | Sandbox |
|---|---|---|
| Backend service | `fwg-portal-backend` | `fwg-portal-backend-sandbox` |
| Frontend service | `fwg-portal-frontend` | `fwg-portal-frontend-sandbox` |
| Database | `fwg_portal` | `fwg_portal_sandbox` (new DB, same Postgres instance) |
| `SF_LOCKED_ORG` | `production` | `sandbox` |
| Salesforce org | your production org | your sandbox org |

`SF_LOCKED_ORG` (see `backend/.env.example`) pins each backend permanently to one org —
the Admin → Salesforce Connection toggle is disabled on both deployments, so there's no way
to accidentally point the Production deployment at Sandbox data or vice versa. Each
deployment still needs Production's *and* Sandbox's credentials saved in Admin → Salesforce
Connection (both org rows exist in every database), but only the locked one is ever used.

**To stand up the second (Sandbox) stack once Production is working:**
1. Postgres → Data tab → `CREATE DATABASE fwg_portal_sandbox;`
2. **+ New → GitHub Repo** → same `fwg-portal` repo → Root Directory `backend` → rename to
   `fwg-portal-backend-sandbox` → Variables: same as Production's backend but with
   `DATABASE_URL` pointed at `fwg_portal_sandbox` and `SF_LOCKED_ORG=sandbox` → Generate Domain
3. **+ New → GitHub Repo** → same repo → Root Directory `frontend` → rename to
   `fwg-portal-frontend-sandbox` → `VITE_API_BASE_URL` pointed at step 2's domain → Generate
   Domain
4. Back in `fwg-portal-backend-sandbox` → update `CLIENT_ORIGIN` to step 3's frontend domain
5. Log in to the Sandbox frontend, create its own admin user (step 13 above, run against
   `fwg_portal_sandbox`), and fill in Admin → Salesforce Connection → Sandbox with your
   sandbox org's Consumer Key/Secret/integration user

Both stacks then run indefinitely side by side under the same Railway project, sharing only
the underlying Postgres instance (as two separate databases) — pushing to `main` redeploys
both automatically unless you split them onto different branches later.

## 3. Architecture recap

```
frontend (React/Vite, SPA)
   │  fetch() with Bearer JWT
   ▼
backend (Express, /api/*)
   │             │
   ▼             ▼
Postgres      Salesforce (jsforce, one shared session per org,
(users,       reused across all client logins — see
 otp,         backend/src/services/salesforce.js)
 logs,
 settings)
   │
   ▼
Anthropic API (Ask AI — tool-scoped to the caller's own
 SFDC Account Id; see backend/src/routes/askai.js)
```

## 4. What's implemented vs. what to finish before go-live

**Implemented (real logic, not just UI):**
- Login → OTP (validated against the user's last-issued code only) → session JWT
- Forgot password → OTP → reset
- Admin: Users (search, paginate, Salesforce sync, edit, reset password, welcome email,
  activate/deactivate), Email templates + SMTP settings, Salesforce Connection (Production +
  Sandbox, with shared/cached session reuse), Claude/Ask AI settings, Application Logs
- Client: My Events / Old Events (search, paginate, scoped to the logged-in Account),
  Event Detail with Wine Sold + Photos related lists, Dashboards, Reports (year filter,
  month/state drilldowns, quarter + brand charts), FAQs, Having Trouble, Ask AI
  (tool-scoped to the caller's own events/wine-sold/reporting/photos only)

**Worth doing before real client traffic:**
- Rate limiting on `/api/auth/*` (brute-force protection beyond the 5-attempt OTP lockout)
- Encrypt secrets at rest (SMTP password, Salesforce consumer secret, Claude API key) rather
  than storing them as plaintext columns — e.g. via Postgres `pgcrypto` or a KMS
  (there's already `CREATE EXTENSION pgcrypto` in the migration, ready to use)
- JWT Bearer flow for Salesforce (instead of username-password) if your production org
  enforces stricter API security policies
- A `logo.png` in `frontend/public/` (referenced by `VITE_LOGO_URL`)
- Real FAQ content (seed the `faqs` table — currently empty)
- Login IP-range enforcement (the `login_ip_range` column exists; middleware to check
  incoming request IP against it isn't wired up yet)
