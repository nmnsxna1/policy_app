# PolicyPilotAI — Recording Script (10 min)

---

## 1. Introduction (0:00–0:30)

"Hi everyone, I'm going to walk you through **PolicyPilotAI**, a full-stack loan approval platform built by **Sxna Technologies**.

The system lets applicants upload policy documents, uses AI to extract structured data, runs validation and risk scoring, then sends it through a multi-role review workflow — Policy Manager approves/rejects/escalates, Senior Manager handles escalated cases — with email notifications and analytics throughout.

Let me break down the architecture, dive deep into the backend AI pipeline, then show a live walkthrough."

---

## 2. Architecture & Tech Stack (0:30–1:15)

[SHOW README or project tree]

"The project has two parts:

**Frontend** — `frontend/` directory. React 19 with TypeScript, Vite 8 for building, Tailwind CSS v4 for styling, React Router v7 for routing, TanStack React Query v5 for server state management, Recharts for charts, Axios for HTTP calls.

**Backend** — `backend/` directory. Python FastAPI server with SQLAlchemy 2 ORM, SQLite database, JWT authentication via python-jose, and an OpenAI-compatible AI client for document extraction.

The frontend runs on port 5173 and proxies `/api` requests to the backend on port 8000."

[SHOW backend/main.py]

"Here's `main.py` — we initialize the FastAPI app, add CORS middleware to allow cross-origin requests from the dev server, include four routers: **auth**, **applications**, **notifications**, and **analytics**. On startup, the code creates all database tables and seeds three test users."

---

## 3. Database Models & State Machine (1:15–2:00)

[SHOW backend/app/models/application.py]

"The core of the workflow is a **state machine** in the Application model. Let me explain the states:

We have 10 statuses in `ApplicationStatus` — starting from **DRAFT**, then **UPLOADED** after PDF upload, **AI_PROCESSED** after extraction, correction if needed, **READY_TO_SUBMIT**, **PENDING_PM_REVIEW**, **ESCALATED**, and terminal states **APPROVED**, **REJECTED**, **WITHDRAWN**.

The `VALID_TRANSITIONS` dict is the rulebook. From **PENDING_PM_REVIEW**, a manager can go to APPROVED, REJECTED, or ESCALATED. From **ESCALATED**, a senior manager can go to APPROVED or REJECTED — no further escalation."

[SHOW backend/app/workflow/engine.py]

"The `can_transition` function is simple — it checks if the target status is in the allowed list. Every status change in the service layer goes through this guard."

[SHOW model user, applicant_detail, decision, risk_assessment]

"Other models include **User** with roles, **ApplicantDetail** storing extracted fields like name, PAN, income, **Decision** recording who approved/rejected and why, **RiskAssessment** storing risk level and explanation, **ValidationFlag** for field-level errors, **SupportingDocument** for uploaded proofs, and **Notification** for in-app alerts."

---

## 4. Frontend Walkthrough (2:00–3:00)

### 4a. Routes [SHOW frontend/src/App.tsx]

"Frontend routing in `App.tsx`. Everything is wrapped in `QueryClientProvider`, `BrowserRouter`, and `AuthProvider`.

The `ProtectedRoute` component handles auth — if not authenticated, redirect to `/login`. It also optionally checks roles:

- **APPLICANT** routes: `/dashboard`, `/new-application`, `/my-applications`, `/application/:id`
- **POLICY_MANAGER** routes: `/dashboard`, `/pending-reviews`, `/search`, `/analytics`, `/application/:id`
- **SENIOR_MANAGER** routes: `/dashboard`, `/escalated-cases`, `/search`, `/analytics`, `/application/:id`"

### 4b. Auth Flow [SHOW frontend/src/store/auth.tsx]

"The auth context — on login, we POST to `/auth/login`, get back a JWT access token and user object with role, store both in localStorage. The `useAuth` hook provides `login`, `logout`, and `isAuthenticated`."

### 4c. Key Components [SHOW RiskGauge.tsx, EnhancedAiOverview.tsx]

"`RiskGauge` is a pure SVG component — renders a 180-degree radial gauge, green for LOW risk, amber for MEDIUM, red for HIGH, with animated gradient fills and a tooltip showing the explanation.

`EnhancedAiOverview` computes four metrics: **completeness** — what percentage of required fields are filled, **income health** — coverage-to-income ratio, **credit score** rating, and **risk factors** — unresolved validation errors. It shows an overall badge: Good, Caution, Needs Review."

---

## 5. Backend Architecture — Router Layer (3:00–3:45)

[SHOW backend/app/routers/applications.py]

"Let's go into the backend. The router layer defines HTTP endpoints. In `applications.py`, we have:

`POST /draft` — creates a new application in DRAFT status
`POST /{app_id}/upload` — uploads a PDF
`POST /{app_id}/process-ai` — triggers the AI pipeline
`PUT /{app_id}/details` — update extracted data
`POST /{app_id}/submit` — submit for review
`POST /{app_id}/approve`, `/reject`, `/escalate` — manager actions
`GET /dashboard` — role-based dashboard data
`GET /search/{query}`, `/advanced-search` — search with filters"

[SHOW route ordering comment about advance-search before app_id]

"Important detail: the `/advanced-search` and `/search/{query}` endpoints must be placed **before** `/{app_id}` in the router file. Otherwise FastAPI would try to parse 'advanced-search' as an integer app_id and fail."

### Auth Dependency [SHOW backend/app/routers/deps.py]

"The `get_current_user` dependency extracts the Bearer token from the Authorization header, decodes the JWT, and returns `user_id` and `role`. The `require_role` helper checks if the user has the required role."

---

## 6. DEEP DIVE: AI Pipeline (3:45–6:30)

"This is the core of the system — 2-3 minutes on how AI extraction works end to end."

### 6a. Trigger [SHOW backend/app/routers/applications.py line 56-70]

"The applicant clicks 'Process with AI', which hits `POST /{app_id}/process-ai`. The router calls `service.process_with_ai(app_id, user_id)`."

### 6b. PDF Text Extraction [SHOW backend/app/docling/processor.py]

"First, `process_pdf` uses IBM's **Docling** library. It converts the PDF to markdown text and extracts any tables. Docling handles complex layouts — tables, headers, multi-column documents. The output is raw markdown text plus table data."

### 6c. LLM Extraction [SHOW backend/app/ai/client.py + prompts.py + extractor.py]

"Next, `extract_from_text` takes that markdown and sends it to an LLM. Let me show you the chain:

**AI Client** — `client.py` creates an OpenAI-compatible client using `base_url` and `api_key` from config. This works with OpenAI, Ollama, or any OpenAI-compatible provider.

**Prompt** — `prompts.py` has `EXTRACT_PROMPT` — a detailed system prompt that instructs the LLM to extract 16 specific fields: full_name, dob, age, gender, pan, aadhaar, address, email, phone, occupation, employer, annual_income, monthly_income, coverage_amount, policy_type, credit_score, bank_details, nominee, plus a summary.

The prompt has rules — normalize values, don't make up data, format PAN as uppercase without spaces, Aadhaar as digits only, phone as 10 digits.

**Extractor** — `extractor.py` calls the LLM with `temperature=0.1` for consistency, enforces `response_format: json_object`. The response is parsed from JSON and returned as a dictionary."

### 6d. Service Layer Integration [SHOW backend/app/services/application_service.py lines 131-214]

"Back in `process_with_ai` in the service layer — here's the full pipeline:

**Step 1** — Call `process_pdf` to get markdown text from the PDF
**Step 2** — Call `extract_from_text` to get structured data from the LLM
**Step 3** — Map each extracted field to the `ApplicantDetail` model — full_name, dob, pan, income, etc.
**Step 4** — Save the raw JSON to `raw_extracted_json` for audit
**Step 5** — Update application status to AI_PROCESSED
**Step 6** — Regenerate the application number based on the detected policy_type — for example if the AI detects 'CAR', the number becomes PL-202607-CA0001
**Step 7** — Log the audit trail
**Step 8** — Run validation: `validate_applicant_detail` checks every field — PAN format, Aadhaar format, email format, phone format, age range, positive income, coverage cap
**Step 9** — Run risk assessment: `assess_risk` evaluates coverage-to-income ratio, income level, validation error count, credit score, and age — returns HIGH/MEDIUM/LOW with explanation
**Step 10** — Save validation flags and risk assessment to database
**Step 11** — Return the complete application detail to the frontend"

[SHOW backend/app/ai/schemas.py]

"There's also a Pydantic schema `AIExtractedData` that defines the expected types — for type safety and potential validation."

---

## 7. Validation Engine (6:30–7:00)

[SHOW backend/app/validation/engine.py]

"The validation engine `validate_applicant_detail` is a pure function — takes a data dict, returns a list of flags.

It checks required fields first — 12 mandatory fields. Then format validation: PAN regex `[A-Z]{5}[0-9]{4}[A-Z]`, Aadhaar exactly 12 digits, email with basic format, phone 10 digits after stripping +91 prefix, age between 21 and 60, positive income and coverage.

A key business rule: coverage amount cannot exceed `loan_multiplier` × annual income. If the multiplier is 10 and income is 5 lakhs, coverage cap is 50 lakhs. This is configurable in `.env`.

Flags with **ERROR** severity block application submission. **WARNING** flags don't block."

---

## 8. Risk Assessment Engine (7:00–7:30)

[SHOW backend/app/risk/engine.py]

"The risk assessment `assess_risk` is also a pure scoring function. It assigns points:

- Coverage-to-income ratio > 8x → +30 points (very high), > 5x → +15 points
- Annual income < 2 lakhs → +20 points, < 5 lakhs → +10 points
- More than 5 unresolved validation errors → +25 points, > 2 → +10 points
- Credit score < 600 → +30 points, < 700 → +15 points
- Age > 55 → +5 points

Total >= 50 → HIGH risk. >= 25 → MEDIUM. Below → LOW.

The explanation string lists all contributing factors — so the manager can see exactly why the risk level was assigned."

---

## 9. Email Notifications (7:30–8:00)

[SHOW backend/app/notifications/email_service.py]

"When a manager approves or rejects, the `_make_decision` method in the service sends an email. The email system has two strategies:

**Primary** — Brevo REST API via HTTPS on port 443. This is the recommended path because corporate firewalls often block SMTP ports 587 and 465. It sends a JSON payload with sender, recipient, subject, and HTML content to `api.brevo.com/v3/smtp/email`.

**Fallback** — traditional SMTP if the API key isn't configured.

Both run in **daemon threads** so the HTTP response isn't blocked. The email has professional HTML templates with the applicant's name, loan amount, policy type, application number, and company branding."

---

## 10. Analytics (8:00–8:30)

[SHOW backend/app/services/analytics_service.py + routers/analytics.py]

"The analytics module has three endpoints:

`GET /analytics/dashboard` — returns KPIs: total applications, submitted count, approved/rejected/pending/escalated counts, approval and rejection rates, average risk score, risk distribution (low/medium/high), and a list of applications.

`GET /analytics/trends` — groups applications by month and returns submitted/approved/rejected/total counts for a bar chart.

`GET /analytics/risk-distribution` — returns the count and percentage of each risk level across all applications.

On the frontend, `AnalyticsDashboard.tsx` displays these in KPI stat cards at the top, a Recharts donut chart for risk distribution, and a bar chart for monthly trends, with a date range filter."

---

## 11. Live Demo — Full Flow (8:30–9:45)

[NOW screen-record the browser]

"Let me walk through the complete flow end to end:

**Step 1** — Login as applicant: `applicant` / `app123`. The dashboard shows zero applications."

**Step 2** — Click 'New Application'. A draft is auto-created with a number like `PL-202607-OT0001`."

**Step 3** — Upload a PDF policy document. The status changes to UPLOADED."

**Step 4** — Click 'Process with AI'. Watch the backend — it calls Docling to extract text, then the LLM to extract fields. After a few seconds, the form auto-populates with the applicant's name, PAN, income, coverage amount, policy type. The AI Assessment panel shows completeness percentage, income health, credit score status, and risk factors."

**Step 5** — Edit any incorrect fields, then click Submit. Status becomes PENDING_PM_REVIEW."

**Step 6** — Logout. Login as manager: `manager` / `manager123`. Dashboard shows 1 pending review."

**Step 7** — Go to Pending Reviews. Click into the application. We see the section-wise form with Personal Details, Identity & Contact, Income & Employment, Policy Details, Bank & Nominee. The AI Assessment shows 100% completeness. The Risk Gauge shows the risk level."

**Step 8** — Click Approve. Status changes to APPROVED. The applicant gets an email notification."

**Step 9** — Navigate to Smart Search — filter by status or risk level. Navigate to Analytics — KPI cards show approval rate, donut chart shows risk distribution, bar chart shows monthly trends."

**Step 10** — Logout. Login as senior: `senior` / `senior123`. Escalated cases are visible for final decision."

---

## 12. Wrap-up (9:45–10:00)

"So that's PolicyPilotAI — from PDF upload through AI extraction, validation, risk scoring, multi-role review, email notifications, and analytics.

The architecture is cleanly layered: **models** define the schema, **repositories** handle database access, **services** contain business logic, **routers** define HTTP endpoints, and **components** render the UI. Each layer has a single responsibility, making the system easy to test and extend.

Thanks for watching!"
