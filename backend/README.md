# MedCheck Backend (FastAPI + Supabase)

This backend fixes MedCheck v3's biggest weaknesses as a pure
client-side app:

- The Groq API key is no longer bundled into the browser — it lives only
  in this backend's `.env` file.
- All AI calls (analysis, prescription reading, chatbot) and drug-database
  lookups are proxied through here.
- History is stored in a real Postgres database (via Supabase) per
  logged-in user, instead of the browser's localStorage.
- Every endpoint (except `/api/health`) requires a valid, real Supabase
  login — this is real authentication, not a local-only tool anymore.

This project lives at `MedCheck-fullstack/backend`, as a sibling of
`MedCheck-fullstack/frontend` (the React app) — they are two separate,
independently run projects that talk to each other over HTTP.

## 1. Create a Supabase project

1. Go to https://supabase.com, create a free account and a new project.
2. In **Authentication -> Providers**, make sure **Email** is enabled
   (it is by default). For quick local testing you can also turn off
   "Confirm email" under **Authentication -> Settings** so you don't need
   a working email inbox for every signup.
3. Open **SQL Editor -> New query**, paste the contents of
   `supabase_schema.sql` (in this folder), and run it. This creates the
   `analyses` table used for history.

## 2. Get your Supabase API keys (new key system)

Supabase is retiring the old JWT-based `anon` / `service_role` keys in
favour of two simpler keys: a **publishable** key (`sb_publishable_...`,
safe for the browser) and a **secret** key (`sb_secret_...`, server-only).
This project uses the new keys.

1. In your Supabase project, go to **Project Settings -> API Keys**.
2. Click the **"Publishable and secret API keys"** tab.
3. If you see a **"Create new API keys"** button, click it — this adds
   the new keys alongside your project's existing legacy keys without
   breaking anything.
4. Copy:
   - The **Publishable key** (`sb_publishable_...`) — you'll use this in
     the *frontend's* `.env`, not this one.
   - The **Secret key** (`sb_secret_...`) -> goes in `SUPABASE_SECRET_KEY`
     below.
5. Also copy your **Project URL** from the same page (or the "Connect"
   button on your project dashboard) -> `SUPABASE_URL`.

You do **not** need a JWT secret for this backend — it verifies logins by
asking Supabase's own Auth server directly (`supabase.auth.get_user()`),
which works with either the old or new key system and won't break if
Supabase rotates its signing keys later.

## 3. Get a Groq API key

Free at https://console.groq.com -> API Keys.

## 4. Configure environment variables

```bash
cd backend
cp .env.example .env
# then edit .env and fill in GROQ_API_KEY, SUPABASE_URL, SUPABASE_SECRET_KEY
```

## 5. Install & run

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000`. Interactive docs (Swagger UI)
are automatically available at `http://localhost:8000/docs` — useful for
testing endpoints directly, independent of the frontend.

## Endpoints

| Method | Path | Auth required | Purpose |
|---|---|---|---|
| GET | `/api/health` | No | Health check |
| POST | `/api/analyze` | Yes | Main drug-interaction analysis (Groq) |
| POST | `/api/prescription/read` | Yes | Read a prescription photo (Groq vision) |
| POST | `/api/chat` | Yes | MedBot chatbot reply (Groq) |
| GET | `/api/drugs/search?q=` | Yes | Multi-source drug name search |
| GET | `/api/drugs/details?name=` | Yes | RxNorm drug class lookup |
| GET | `/api/history` | Yes | List the logged-in user's saved analyses |
| POST | `/api/history` | Yes | Save a new analysis |
| DELETE | `/api/history/{id}` | Yes | Delete one saved analysis |
| DELETE | `/api/history` | Yes | Clear all of the user's history |

"Auth required" means the request must include:
```
Authorization: Bearer <supabase_access_token>
```
The frontend's `src/lib/apiClient.js` attaches this automatically once a
user is logged in via Supabase Auth.

## How authentication works

- The frontend uses `@supabase/supabase-js` directly with your project's
  **publishable** key (safe to expose — it can only do what your RLS
  policies allow) to sign users up / log them in. Supabase handles
  password hashing, sessions, and issuing tokens.
- Every API call from the frontend attaches the current session's
  `access_token` as a Bearer token.
- This backend verifies that token by calling `supabase.auth.get_user()`
  (`app/auth.py`) using an admin client built from the **secret** key —
  Supabase's own Auth server checks the token's validity, so this backend
  never has to know or manage a signing secret itself.
- The backend then uses that same admin-level client (which bypasses Row
  Level Security) to talk to Postgres, but always manually filters every
  query by the authenticated user's ID — so one user can never read or
  delete another user's history, even though the secret key itself could
  technically see everything.

## Note on testing

This code was written and logic-verified with a simulated Supabase client
(auth accept/reject paths, and the full history create/list/delete
round-trip all confirmed to behave correctly), but it has **not** been
run end-to-end against a live Groq key or a live Supabase project, since
that requires your own credentials. Follow the setup steps above, then
test via `/docs` before wiring up the frontend, so any typo in your
`.env` is easy to spot early.
