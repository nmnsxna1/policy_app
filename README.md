# PolicyPilotAI — Loan Approval Platform

A full-stack loan/policy application platform with AI-powered document extraction, risk assessment, multi-role workflow (Applicant → Policy Manager → Senior Manager), and analytics.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, React Router 7, TanStack React Query 5, Recharts 3, Axios |
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2, SQLite, Pydantic 2, python-jose (JWT) |
| AI/ML | OpenAI-compatible API (works with Ollama, OpenAI, etc.), Docling (PDF parsing) |
| Email | Brevo REST API (v3) via HTTPS (port 443) — falls back to SMTP (port 587) |

---

## Prerequisites

- **Node.js** 20+ and **npm** 9+
- **Python** 3.11+
- **Ollama** (optional — for local AI inference) or an OpenAI API key

---

## Quick Start

### 1. Clone & Install Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate    # Windows
# source .venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
```

### 2. Configure Backend Environment

Copy the template below into `backend/.env` (this file is gitignored — never commit it):

```env
DATABASE_URL=sqlite:///./loan_approval.db
SECRET_KEY=your-random-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# AI Provider — Ollama (local) example:
AI_BASE_URL=http://localhost:11434/v1
AI_API_KEY=ollama
AI_MODEL=llama3.1:8b

# Or use OpenAI:
# AI_BASE_URL=https://api.openai.com/v1
# AI_API_KEY=sk-your-openai-key
# AI_MODEL=gpt-4o

UPLOAD_DIR=./uploads

# Email (Brevo) — required for approval/rejection notifications
MAIL_FROM=your-verified-sender@example.com
MAIL_USERNAME=your-brevo-smtp-username
MAIL_PASSWORD=your-xsmtpsib-...-password
MAIL_SERVER=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_STARTTLS=True
MAIL_SSL_TLS=False

# Brevo REST API key (starts with xkeysib-) — used instead of SMTP
# Get one: Brevo Dashboard → API Keys → Create a new API key
MAIL_API_KEY=xkeysib-your-api-key-here

LOAN_MULTIPLIER=10
```

### 3. Start Backend

```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level info
```

The server starts at `http://localhost:8000`. Auto-generated seed users:

| Username | Password | Role |
|----------|----------|------|
| `applicant` | `app123` | APPLICANT |
| `manager` | `manager123` | POLICY_MANAGER |
| `senior` | `senior123` | SENIOR_MANAGER |

### 4. Install & Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`.

---

## Features

### Applicant Workflow
1. **New Application** — auto-creates a draft, upload a PDF policy document
2. **AI Extraction** — extracts personal info, income, policy details from PDF
3. **Edit & Validate** — correct extracted data in section-wise form (Personal, Identity, Income, Policy, Bank)
4. **Upload Supporting Docs** — upload Aadhaar, PAN, Income Proof PDFs
5. **Submit** — moves application to PENDING_PM_REVIEW

### Policy Manager Workflow
- **Dashboard** — view pending/escalated counts, recent applications
- **Pending Reviews** — review submitted applications
- **Application Detail** — view extracted data by section, AI assessment, Risk Gauge, PDF preview, supporting documents
- **Approve / Reject / Escalate** — with optional notes
- **Smart Search** — search by application number, filter by status/risk/type/date
- **Analytics Dashboard** — KPIs, risk distribution (donut chart), monthly trends (bar chart), export PDF

### Senior Manager Workflow
- **Dashboard** — escalated cases overview
- **Escalated Cases** — final approve/reject decisions
- **Smart Search** — same as PM
- **Analytics Dashboard** — same as PM

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── ai/                 # AI extraction client & prompts
│   │   ├── core/               # Config, DB, security
│   │   ├── docling/            # PDF text extraction
│   │   ├── models/             # SQLAlchemy models
│   │   ├── notifications/      # Email service (Brevo API)
│   │   ├── repositories/       # DB access layer
│   │   ├── risk/               # Risk assessment engine
│   │   ├── routers/            # FastAPI route handlers
│   │   ├── services/           # Business logic
│   │   ├── validation/         # Field validation engine
│   │   └── workflow/           # State machine transitions
│   ├── main.py                 # FastAPI entry point
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI components (RiskGauge, EscalationModal, etc.)
│   │   ├── layouts/            # AppLayout, Sidebar
│   │   ├── pages/              # Route pages
│   │   ├── services/           # Axios API client
│   │   ├── store/              # Auth context
│   │   ├── types/              # TypeScript interfaces
│   │   └── utils/              # Validation helpers
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## Environment Variables (Backend `.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | SQLite path or PostgreSQL URL | Yes |
| `SECRET_KEY` | JWT signing secret | Yes |
| `AI_BASE_URL` | OpenAI-compatible API base URL | Yes |
| `AI_API_KEY` | API key for AI provider | Yes |
| `AI_MODEL` | Model name (e.g. `gpt-4o`, `llama3.1:8b`) | Yes |
| `MAIL_API_KEY` | Brevo REST API key (`xkeysib-...`) | For email |
| `MAIL_FROM` | Verified sender email in Brevo | For email |
| `MAIL_USERNAME` | Brevo SMTP login | Fallback only |
| `MAIL_PASSWORD` | Brevo SMTP password | Fallback only |

---

## Git & Secrets

The following files are gitignored and must never be committed:

```
backend/.env
.env
**/__pycache__/
node_modules/
dist/
uploads/
*.db
```

To initialize the repo:

```bash
git init
git add .
git commit -m "Initial commit"
```

> **Important**: The `.env` file contains live API keys (Brevo, AI provider). The root `.gitignore` already excludes `backend/.env`. Verify before pushing.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `ECONNREFUSED` on `/api/*` | Backend not running | Start backend on port 8000 |
| Blank page on app detail | React render crash | Check browser console for errors |
| Email not sent | Brevo API key missing or wrong sender | Verify `MAIL_API_KEY` and `MAIL_FROM` in `.env` |
| "Missing or invalid token" | Not logged in or token expired | Log in again at `/login` |
| AI extraction fails | AI provider not reachable or wrong model | Check `AI_BASE_URL` / `AI_API_KEY` |
| "Failed to create draft" | 403 (wrong role) or DB locked | Log in as `applicant`; delete `loan_approval.db` |
