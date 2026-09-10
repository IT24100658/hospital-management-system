# Hospital Management System (HMS)

A full Hospital Management System built with the **MERN stack** (MongoDB, Express, React, Node.js) as an SLT software internship project. Covers the full specification: user management with role-based access, patients, doctors & departments, appointments, electronic medical records, laboratory, pharmacy, billing, staff management, reports and audit logs.

## Features

| Module | Details |
| --- | --- |
| Authentication | Email/username login, JWT sessions with expiry, password change |
| Users & Roles | Admin, Doctor, Nurse, Receptionist, Lab, Pharmacist, Accountant with RBAC |
| Patients | Registration, search, profile, medical history, document upload |
| Doctors | Profiles, specializations, departments, schedules |
| Appointments | Book / reschedule / cancel / status tracking |
| EMR | Diagnosis, prescriptions, vital signs, treatment plans |
| Laboratory | Test requests, sample collection, result entry, abnormal flags |
| Pharmacy | Inventory, stock levels, expiry alerts, prescription dispensing |
| Billing | Invoices by category, payments, paid/partial/unpaid, printable receipt |
| Staff | Roster, attendance, leave requests & approvals |
| Reports | Revenue, patients, appointments, pharmacy, lab, staff analytics |
| Audit Trail | Automatic logging of actions per user |

## Tech stack

- **Backend**: Node.js, Express, Mongoose, JWT, bcrypt, Multer
- **Frontend**: React 18, React Router, Axios, Recharts
- **Database**: MongoDB (local or Atlas)

## Run locally

Prerequisites: Node.js 18+, MongoDB running.

```bash
# 1. Install dependencies
npm run install:all

# 2. Configure environment
cp server/.env.example server/.env
#   - set MONGO_URI (defaults to local mongodb://127.0.0.1:27017/hospital_management)
#   - set a strong JWT_SECRET

# 3. Seed demo data (creates admin + sample data)
npm run seed

# 4. Start
npm run dev:server   # API on http://localhost:5001  (5000 may be taken on macOS)
npm run dev:client   # UI on  http://localhost:5173
```

Open http://localhost:5173 and log in.

### Demo accounts (password: `admin123`)

`admin` (Administrator) · `reception` · `nurse` · `labtech` · `pharmacist` · `accountant`

The database is auto-seeded on first boot if no users exist, so no manual seeding is needed when deploying.

## Deploy to free hosting (Render + MongoDB Atlas)

### Fastest: one-command script (recommended)

1. Copy the template and fill in **5 codes** (all from your own accounts):
   ```bash
   cp deploy.env.example deploy.env
   ```
   - `GITHUB_TOKEN`   — https://github.com/settings/tokens → *Generate new token (classic)* → tick `repo`
   - `GITHUB_USER`    — your GitHub username
   - `ATLAS_PUBLIC` + `ATLAS_PRIVATE` — https://cloud.mongodb.com → menu → *Access Manager → API Keys → Create API Key* (sign up free first at https://www.mongodb.com/cloud/atlas/register)
   - `RENDER_API_KEY` — https://render.com (sign up free) → https://dashboard.render.com/u/apikeys → *Create API Key*

2. Run one command:
   ```bash
   sh scripts/deploy.sh
   ```

It creates a public GitHub repo, pushes the code, creates a free MongoDB Atlas cluster + database user, creates a free Render web service, and waits until it's live — then prints your URL.

### Manual fallback

1. **MongoDB Atlas** (free M0 cluster):
   - Create a cluster at https://www.mongodb.com/atlas
   - Database Access → add a user (read/write)
   - Network Access → `0.0.0.0/0` (allow all) for simplicity
   - Connect → Drivers → copy the connection string ending in `hospital_management` (add this DB name if not present)

2. **Render** (free web service):
   - Push this repo to GitHub: github.com → New repository → upload/push files, then `git push`
   - At https://render.com → New → **Blueprint** → select the repo (auto-detects `render.yaml`)
   - Set the environment variables (marked `sync: false`):
     - `MONGO_URI`  → your Atlas connection string
     - `JWT_SECRET` → any long random string
     - `CLIENT_URL` → `https://your-app-name.onrender.com`
   - Deploy. Once live you get a URL like `https://your-app-name.onrender.com` — this is the URL to send to SLT.

3. **Verify**: open `/api/health` — it should return `{"status":"ok"}`. Then open the app root and log in with `admin` / `admin123`.

> After first deploy, admin password is `admin123` — change it from the UI (key icon, top right) before sharing the URL.

## Project structure

```
hospital-management-system/
├── package.json          # root: build + start orchestration
├── render.yaml           # Render blueprint
├── server/
│   ├── app.js            # express app + serves built client
│   ├── server.js         # entry (auto-seeds when empty)
│   ├── config/           # env + db connection
│   ├── models/           # Mongoose schemas
│   ├── controllers/      # route handlers
│   ├── routes/           # REST endpoints
│   ├── middleware/       # auth, RBAC, audit
│   ├── utils/            # permissions, sequence ids, upload
│   ├── seed/             # demo-data seeder
│   └── uploads/          # patient documents
└── client/
    ├── src/
    │   ├── pages/        # one page per module
    │   ├── components/   # layout + shared UI
    │   ├── context/      # auth context
    │   ├── api/          # axios client
    │   └── styles/       # global css
    └── dist/             # production build (served by the API)
```

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Login, returns JWT |
| GET/POST/PUT/DELETE | `/api/patients` | Patient management (+ `/:id/documents` upload) |
| GET/POST/PUT/DELETE | `/api/doctors`, `/api/departments` | Doctor & department management |
| GET/POST/PUT | `/api/appointments` | `/:id/reschedule`, `/:id/cancel`, `/:id/status` |
| GET/POST/PUT/DELETE | `/api/records` | Electronic medical records |
| GET/POST/PUT | `/api/labs` | `/:id/collect`, `/:id/result` |
| GET/POST/PUT | `/api/pharmacy` | Inventory, `/alerts`, `/prescriptions` dispense |
| GET/POST/PUT/DELETE | `/api/billing` | Invoices, `/:id/payments` |
| GET/POST/PUT/DELETE | `/api/staff` | Staff, `/attendance`, `/leaves` |
| GET | `/api/reports/*`, `/api/dashboard/*` | Analytics |
| GET | `/api/audit` | Audit trail |

## Security notes

- Passwords hashed with bcrypt; JWT expiry provides automatic session timeout
- Role-based access control enforced on every endpoint
- Change `JWT_SECRET` in production
- Patient documents are stored on the server's uploads folder (keep `/uploads` writable on Render's free disk, or switch to object storage for production scale)