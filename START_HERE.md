# Chrona Business — Developer Guide

## 1. First-time setup

**Install dependencies**
```bash
npm install
```

**Create your environment file**

Copy `.env.example` to `.env.local` and fill in the three values:
```
NEXT_PUBLIC_SUPABASE_URL=        ← your Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   ← publishable key (not the anon key)
SUPABASE_SERVICE_ROLE_KEY=       ← service role key (keep this secret)
```
Find all three in your Supabase project → Settings → API.

**Set up the database**

Open your Supabase project → SQL Editor → paste the entire contents of `supabase/setup.sql` → Run.

**Load demo data (optional)**
```bash
npm run seed
```
This creates two demo businesses with sample employees, tasks, and events.
All demo passwords: `TestPass123!`

---

## 2. Documentation

Read **`HANDOVER.md`** — it covers every feature of the app in detail, how auth works, what each database table stores, and how all the pieces fit together.

---

## 3. Running the app

```bash
npm run dev        # start dev server at http://localhost:3000
npm run build      # production build
npm run typecheck  # check for TypeScript errors (run before any commit)
```

---

## 3. Config files — what they are and why they exist

| File | Purpose | Touch it? |
|---|---|---|
| `package.json` | Lists all dependencies and npm scripts | Only to add packages |
| `package-lock.json` | Locks exact dependency versions | Never manually |
| `tsconfig.json` | TypeScript compiler settings | Rarely |
| `next.config.ts` | Next.js framework config | Rarely |
| `postcss.config.mjs` | Required for Tailwind CSS to process styles | Never |
| `proxy.ts` | Auth middleware — protects pages, refreshes sessions | Carefully |
| `.env.local` | Your secret credentials — never share or commit | Add your keys |

---

## 4. Folder map

```
app/
  (marketing)/      Public pages: landing, login, signup wizard
  (app)/            Protected app: dashboard, tasks, calendar, organisation, settings
  api/              Server-side API routes (notifications, task responses, business switch)
  auth/callback/    Supabase auth redirect handler

components/
  shell/            Layout pieces: sidebars, notification bell, task create button
  dashboard/        Cards, progress bars, live activity tracker
  marketing/        Landing page animations and mockups
  ui/               Base components: Button, Input, Label

lib/
  auth/             Who can do what: permissions.ts, roles.ts, session.ts
  supabase/         Database clients (browser / server / admin) and type definitions
  tasks/            Task create/update/assign server actions
  business/         Signup wizard logic and email invitations
  calendar/         Free time window calculation
  dashboard/        Efficiency and workload heuristics
  realtime/         Live presence subscription

supabase/
  migrations/       SQL files 0001–0004 — the actual database schema
  setup.sql         All migrations combined — run this for a fresh database

scripts/
  seed.ts           Creates demo businesses, users, tasks for testing

public/             Static files (favicon)

job/                Job description and intern onboarding documents
```

---

## 5. How the app works (key concepts)

**Roles** — every user has a role: `employer → c_suite → manager → team_lead → employee`. All permissions flow from `lib/auth/permissions.ts`. The database enforces the same rules via Row-Level Security.

**Task lifecycle** — `pending → awaiting_acceptance → in_progress → completed`. When a manager assigns a task the employee gets a notification and must accept before starting.

**Activity status** — each user has a live status (available / tasking / offline) shown to the team in real time. Starting a task auto-sets it to `tasking`; completing auto-sets it back to `available`.

**Notifications** — real-time bell in the top bar. Powered by Supabase Realtime — no polling.

**Multi-business** — one user can belong to multiple businesses. The active business is stored in a cookie and can be switched from the sidebar.

---

## 6. Deploy to Vercel

1. Push code to a GitHub repo
2. Import in [vercel.com](https://vercel.com) → New Project
3. Add the same three env vars from step 1
4. Deploy (takes ~2 min)
5. Go to Supabase → Auth → URL Configuration → add your Vercel URL to the redirect list
