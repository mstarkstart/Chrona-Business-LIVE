# Intern Guide — Chrona Business

Welcome. This document is your single source of truth for the 15-day engagement. Read it fully before writing a single line of code.

---

## 1. What Is Chrona Business?

Chrona Business is a SaaS platform for managing small-to-medium businesses. It covers:

- **Tasks** — create, assign, track, and approve tasks with a full status lifecycle
- **Organisation** — departments, teams, members, roles, and invitations
- **Calendar** — personal scheduling with time blocks and free-window detection
- **Notifications** — real-time bell notifications for task assignments and responses
- **Activity presence** — live team status (available / tasking / offline)
- **Dashboard** — role-aware views for employers, managers, team leads, and employees
- **Settings** — profile, business info, and a customisable multi-function action button

The app is live on Vercel and connected to a Supabase project in production.

---

## 2. Stack — What You Need to Know

### Next.js 16 (App Router)
This is **not** standard Next.js. Version 16 has breaking changes:
- Middleware is named `proxy.ts`, not `middleware.ts`
- `cookies()` is **async** — always `await cookies()`
- `params` and `searchParams` in pages are **Promises** — always `await` them
- Server Actions use `"use server"` at the top of the file or function
- No `getServerSideProps` — everything uses Server Components or Actions

Before touching any routing or auth code, read `node_modules/next/dist/docs/index.md`.

### Supabase
- **Auth** — email/password via `@supabase/ssr`. Sessions are stored in cookies, refreshed by the proxy on every request.
- **Database** — PostgreSQL with Row-Level Security (RLS). Every table has policies. If a query returns empty unexpectedly, check RLS first.
- **Realtime** — `activity_status` and `notifications` tables are subscribed to live in the client.
- **Three clients:**
  - `lib/supabase/client.ts` — browser-side (publishable key)
  - `lib/supabase/server.ts` — server-side async (reads/writes cookies)
  - `lib/supabase/admin.ts` — service-role only, bypasses RLS, server-only

### TypeScript
Strict mode. No `any`. If the type is complex, use `unknown` and narrow it. The type stubs are in `lib/supabase/database.types.ts` — these are hand-written, not auto-generated. If you add a table or column, update this file.

### Tailwind CSS v4
Uses `@import "tailwindcss"` syntax. No `tailwind.config.js`. Custom utilities are in `app/globals.css`. Do not add a config file.

### PostgreSQL / Supabase SQL
Migrations are in `supabase/migrations/`. Run them in order in the Supabase SQL editor. The combined file is `supabase/setup.sql`. If you add a table:
1. Write a new migration file (`0005_yourfeature.sql`)
2. Add RLS policies
3. Update `setup.sql`
4. Update `lib/supabase/database.types.ts`

---

## 3. Local Setup

```bash
# 1. Clone the repo and install dependencies
npm install

# 2. Create .env.local with the following:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key   # NOT anon key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 3. Run the database setup
# Paste supabase/setup.sql into the Supabase SQL Editor and execute it

# 4. (Optional) Seed demo data
npm run seed

# 5. Start dev server
npm run dev

# 6. Type check (run this before every commit)
npm run typecheck
```

> The publishable key is NOT the same as the anon key. In newer Supabase projects, look for "publishable key" in the API settings.

---

## 4. Key Files and Directories

```
proxy.ts                    Auth middleware (runs on every request)
app/
  (marketing)/              Public pages: landing, login, signup wizard
  (app)/                    Protected app pages: dashboard, tasks, calendar...
  (app)/layout.tsx          Root app layout — loads notifications, sidebars, presence
  api/                      API routes (notifications, task respond, business switch)
  auth/callback/            Supabase magic-link code exchange

lib/
  auth/
    permissions.ts          can(role, action) — single truth for access control
    session.ts              requireUser(), requireActiveBusiness()
    roles.ts                Role hierarchy and labels
  tasks/mutations.ts        Server actions for task CRUD
  supabase/                 Client, server, admin, types

components/
  shell/
    SidebarA.tsx            Left nav (collapsible)
    SidebarB.tsx            Right panel: status, tasks, team presence
    NotificationBell.tsx    Real-time notification bell
    CreateTaskButton.tsx    Task creation modal
  dashboard/Cards.tsx       Card, ProgressBar, Ring components
```

---

## 5. Roles and Permissions

| Role | Rank | What they can do |
|---|---|---|
| employer | 5 | Everything |
| c_suite | 4 | Cross-department visibility |
| manager | 3 | Manage tasks and members in their department |
| team_lead | 2 | Manage team tasks |
| employee | 1 | View and action their own tasks only |

All permission checks go through `can(role, action)` in `lib/auth/permissions.ts`. RLS enforces the same rules at the database level. Never skip the `can()` check in server actions.

---

## 6. Your 15-Day Plan

### Days 1–4: Product Research

Your deliverable is a written Markdown document (`RESEARCH.md` in the repo root) covering:

**Part A — Competitive Analysis**
Pick at least four tools and analyse each one:
- Asana
- ClickUp
- Monday.com
- Linear
- Notion (project management use case)

For each tool, document:
- Core features
- UX patterns (how tasks are created, assigned, tracked)
- Role/permission model
- Notification system
- Calendar and scheduling features
- What type of team/company it targets
- Pricing model
- What they do exceptionally well
- Where they fall short

**Part B — Gap Analysis (vs Chrona)**
Map the features above to what Chrona currently has and does not have. Be specific. For example: "ClickUp has a Gantt chart view — Chrona has no timeline view."

**Part C — Improvement Recommendations**
Based on your research, produce a prioritised list of improvements for Chrona. Format each item as:

```
## [Feature Name]
**Priority:** High / Medium / Low
**Inspired by:** [Tool name]
**What it is:** One paragraph explanation
**Why it matters:** Why users would value this
**Rough effort:** Small (< 1 day) / Medium (1–3 days) / Large (3+ days)
```

The project owner will review this document at the end of Day 4 and use it to define the build scope for Days 5–11.

---

### Days 5–11: Feature Development (7 days)

Scope is confirmed after the Day 4 research review. In general, focus areas will be drawn from the improvement list. Regardless of scope, follow these rules:

**Development rules:**
- Run `npm run typecheck` before every commit — zero errors allowed
- No `any` types
- Every server action must check permissions with `can()`
- Every new table needs RLS policies and a migration file
- Server Components fetch data; Client Components handle interactivity
- No comments explaining *what* code does — only comment *why* if it's non-obvious
- Test the feature in the browser before marking it done

**Daily cadence:**
- Start of day: one-line message to project owner with today's plan
- End of day: one-line message with what was done and any blockers
- If stuck for more than 1 hour: flag it, do not silently lose time

---

### Days 12–15: Polish & Production Prep (4 days)

The goal is a production-ready release. Go through every page of the app and check:

**UI / UX:**
- [ ] Mobile responsiveness (test at 375px width)
- [ ] Loading states — no blank screens while data loads
- [ ] Empty states — every list should handle zero items gracefully
- [ ] Error states — form errors are shown clearly
- [ ] Consistent spacing and typography across all pages

**Logic / Bugs:**
- [ ] All task status transitions work correctly
- [ ] Notifications clear correctly after reading/accepting/declining
- [ ] Activity status updates (available → tasking → available) work
- [ ] Role permissions are enforced — test with each role type

**Security:**
- [ ] No server action is missing a `can()` check
- [ ] No client component exposes data it shouldn't
- [ ] Invitation tokens are single-use and expire correctly

**Deployment:**
- [ ] `npm run build` passes with zero errors and zero warnings
- [ ] All environment variables are set in Vercel
- [ ] Supabase Auth redirect URLs include the production Vercel URL
- [ ] Test the full sign-up flow on production

---

## 7. Things That Will Trip You Up

1. **`cookies()` is async.** Every call is `await cookies()`. Missing this causes a silent bug.
2. **`params` in dynamic routes is a Promise.** Always `const { id } = await params`.
3. **RLS blocks everything by default.** If a query returns nothing and you expect data, the RLS policy is probably the reason. Check Supabase → Authentication → Policies.
4. **The admin client bypasses RLS.** Only use `supabaseAdmin` in API routes and server actions that need to write across user boundaries (e.g. creating notifications for another user).
5. **`revalidatePath` must be called** after any mutation that changes data shown on another page. If you update a task and the dashboard doesn't refresh, you forgot `revalidatePath("/dashboard")`.
6. **Realtime subscriptions are client-only.** You can't use them in Server Components. If you need live data in a page, make that section a Client Component.
7. **The `supabase.auth.signOut()` doesn't clear the active-business cookie.** If you add any sign-out flow, also clear `chrona-active-business` from cookies.

---

## 8. How to Ask for Help

The project owner is available by message. When you ask for help, include:
- What you were trying to do
- What you expected to happen
- What actually happened (include the error message or screenshot)
- What you already tried

Do not send "it's not working" with no context.

---

Good luck. The codebase is clean and well-structured — you should be able to find your footing quickly. Start with `SUMMARY.md` for a full overview of what's already built.
