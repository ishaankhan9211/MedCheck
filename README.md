# MedCheck v3 — Drug Interaction Checker (India Edition)

AI-powered drug interaction checker with an Indian medicine database,
prescription scanning, PDF reports, per-user history, and a MedBot
chatbot — powered by Groq — with a **FastAPI backend**,
**Supabase** authentication, and a **Postgres database** for history.

## What changed from the original client-only version

The original v3 was a pure React/Vite frontend that called Groq and
public drug APIs directly from the browser, with the Groq API key
bundled into the client bundle and history kept in localStorage. This
version adds:

- **A separate FastAPI backend** (`backend/`) that proxies every AI call
  and drug lookup, so the Groq API key never reaches the browser.
- **Supabase Authentication** — real email/password sign-up and login;
  the Checker/Results/History pages are now protected routes.
- **Supabase Postgres** for history — saved analyses are now tied to a
  user's account and available from any device/browser, not just one.
- **Supabase's newer key system** (`sb_publishable_...` /
  `sb_secret_...`), and auth verification that calls Supabase's own Auth
  server directly rather than manually decoding JWTs — the officially
  recommended, more future-proof approach.
- Row Level Security policies as a second layer of protection on top of
  the backend's own per-user filtering.

See `backend/README.md` for backend-specific details (endpoints, how auth
verification works, etc.) and `PROJECT_LIMITATIONS.md` for what's still
not production-ready and why.

## Project structure

This is now **two independent projects, side by side** — they only talk
to each other over HTTP, so you run and deploy them separately.

```
MedCheck-fullstack/
  frontend/              React frontend (Vite) — was the old project root
    src/
      context/AuthContext.jsx      Supabase auth session state
      lib/supabaseClient.js         Supabase client (publishable key)
      lib/apiClient.js               Fetch wrapper that attaches the auth token
      pages/Login.jsx, Signup.jsx     Auth pages
      components/ProtectedRoute.jsx   Route guard
      services/                       Call the backend, not Groq/FDA/etc. directly
  backend/                FastAPI backend
    app/main.py            App entrypoint, CORS, router wiring
    app/auth.py             Verifies Supabase sessions
    app/routers/             analyze / prescription / chat / drugs / history
    supabase_schema.sql      Run this in Supabase's SQL editor once
    README.md                Full backend setup guide
  README.md               This file
  PROJECT_LIMITATIONS.md  Honest list of what's still not production-grade
```

## Quick start

You need **three** things running/configured: a Supabase project, the
backend, and the frontend. See the message this project was delivered
with for the full step-by-step walkthrough (Supabase setup through
`git push`) — this section is just the command summary once everything
is configured.

```bash
# 1) Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then fill in your Groq + Supabase keys
uvicorn app.main:app --reload --port 8000

# 2) Frontend (separate terminal)
cd frontend
npm install
# edit .env with your VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
# open http://localhost:3000
```

## What's in v3 (features)

- Indian Medicine Database: 500+ brands (Dolo, Augmentin, Thyronorm,
  Montair, etc.) — instant local search
- Source badges on every search result: Indian DB / FDA / RxNorm /
  DailyMed / NDC
- One-click PDF report download (jsPDF)
- Per-user analysis history (Supabase Postgres)
- MedBot floating AI chatbot
- Groq Vision prescription photo scanner
- Manual dose/timing editor per drug
- Email/password authentication (Supabase Auth)

