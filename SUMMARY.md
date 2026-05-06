# Chrona Business — Full Build Summary

## Stack

- **Next.js 16** — uses `proxy.ts` not `middleware.ts` (renamed in v16), `cookies()` is async
- **Supabase** — Postgres + Auth + RLS + Realtime + Storage
- **Tailwind CSS v4** — `@import "tailwindcss"` syntax, no tailwind.config needed
- **TypeScript** — strict, no `any`
- **Hosting** — Vercel

---

## Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   <-- NOT anon_key, the new publishable format
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Database — Run Order

Paste into Supabase SQL Editor: **`supabase/setup.sql`** (combines all migrations)

Or run individually:
- `0001_init.sql` — all tables, helper functions, triggers, realtime publications
- `0002_rls.sql` — RLS policies on every table
- `0003_profile_fks.sql` — extra FKs so PostgREST embedded joins to profiles work
- `0004_notifications.sql` — notifications table + `awaiting_acceptance` task status

### Tables

| Table | Purpose |
|---|---|
| `businesses` | Company record (type, industry, partnership flag) |
| `profiles` | 1:1 with auth.users, personal info |
| `departments` | Scoped to business |
| `teams` | Scoped to business + optional department |
| `business_members` | User ↔ business join (role, status, contract) |
| `partners` | Partnership share percentages |
| `approval_requests` | Structural change approvals (partnerships) |
| `tasks` | Full task lifecycle |
| `activity_status` | Current presence — one row per member, upserted |
| `activity_log` | Append-only history (trigger closes previous span) |
| `calendar_events` | Meetings, task blocks, breaks, focus, etc. |
| `invitations` | Token-based email invitations |
| `multi_function_button_config` | Per user+business, up to 6 action keys |
| `notifications` | Task assignments, acceptances, declines, approvals |

### Task Status Values
`pending | in_progress | completed | cancelled | awaiting_approval | awaiting_acceptance`

### Critical Schema Note
`0003_profile_fks.sql` adds extra FKs from:
- `business_members.user_id → profiles.id`
- `tasks.assigned_to → profiles.id`
- `tasks.created_by → profiles.id`
- `approval_requests.requested_by → profiles.id`
- etc.

Without this, PostgREST cannot resolve embedded joins to profiles and all member names show as "Member".

### Helper SQL Functions (all security definer)
- `set_active_business(uuid)` — sets session GUC for RLS scoping
- `current_business_id()` — reads session GUC
- `current_user_role(business_id)` — returns role of auth.uid()
- `is_role_at_or_above(business_id, role)` — boolean hierarchy check
- `is_member_of(business_id)` — boolean membership check

### Realtime Publications
`supabase_realtime` includes: `activity_status`, `tasks`, `approval_requests`, `notifications`

---

## Supabase Dashboard Settings (manual)

Authentication → URL Configuration:
- **Site URL:** `https://your-vercel-url.vercel.app` (or `http://localhost:3000` for dev)
- **Redirect URLs:** `https://your-vercel-url.vercel.app/**`

---

## Roles

| Role | Rank | Scope |
|---|---|---|
| employer | 5 | Full company control |
| c_suite | 4 | Cross-department visibility |
| manager | 3 | Department level |
| team_lead | 2 | Team level |
| employee | 1 | Personal only |

Single source: `lib/auth/permissions.ts` — `can(role, action)`. RLS enforces the same at DB level.

---

## File Structure

```
app/
  (marketing)/
    layout.tsx              Floating frosted navbar
    page.tsx                Landing page (hero + stats + role carousel + bento + live ticker + CTA)
    login/page.tsx
    signup/
      page.tsx              Redirects to /signup/business
      business/page.tsx     Wizard step 1
      account/page.tsx      Wizard step 2 (+ partnership partners sub-step)
      employees/page.tsx    Wizard step 3 (skippable)
      calendar/page.tsx     Wizard step 4 (in-app info only)
      complete/page.tsx     Finalise (creates user + business via admin client)
    invite/[token]/page.tsx Handles both email-link and copy-paste acceptance

  (app)/
    layout.tsx              SidebarA + topbar (bell) + main + SidebarB + floating FAB
    dashboard/page.tsx      Role-based (4 variants in one route)
    tasks/page.tsx          Primary/secondary view by role
    calendar/page.tsx       Today (default) + Week + Month tabs
    calendar/week/page.tsx
    calendar/month/page.tsx
    organisation/page.tsx
    organisation/departments/page.tsx
    organisation/teams/page.tsx
    organisation/members/page.tsx
    organisation/members/[id]/page.tsx
    approvals/page.tsx
    settings/page.tsx
    settings/profile/page.tsx
    settings/business/page.tsx
    settings/multi-function-button/page.tsx

  api/
    business/switch/route.ts        Switch active business cookie
    notifications/create/route.ts   Service-role notification insert
    tasks/respond/route.ts          Employee accept/decline task

  auth/callback/route.ts            Supabase code exchange (magic link + OAuth)
  layout.tsx                        Root layout (Geist fonts, metadata)

lib/
  supabase/
    client.ts         Browser client (publishable key)
    server.ts         Async server client (cookies)
    admin.ts          Lazy proxy service-role client — server-only, never client
    database.types.ts Hand-written type stub (replace with supabase gen types)
    types.ts          Re-exports + Tables<T>, InsertOf<T>, UpdateOf<T>

  auth/
    roles.ts          ROLE_RANK, ROLE_LABEL, isAtOrAbove
    permissions.ts    can(role, action) — single source of truth
    session.ts        requireUser, requireActiveBusiness, listMyMemberships, getActiveBusiness

  business/
    setup.ts          Wizard state stored in base64 httpOnly cookie
    finalize.ts       Creates auth user + business + member + partners + invitations
    invitations.ts    lookupInvitation, acceptInvitation

  tasks/
    mutations.ts      "use server" file — setTaskStatus, approveTask, rejectTask, assignTask
    recommendations.ts Heuristic: suggest lowest-load assignee

  calendar/
    windows.ts        Compute free windows (9am-6pm, next N days)

  dashboard/
    heuristics.ts     efficientEmployees, overworkedEmployees, progressForBusiness, progressForUser

  realtime/
    presence.ts       subscribeActivity, STATUS_COLOUR, STATUS_LABEL

components/
  shell/
    SidebarA.tsx              Left sidebar — client component, collapsible (localStorage)
    SidebarB.tsx              Right sidebar — client component, collapsible (localStorage)
    MultiFunctionButton.tsx   Floating FAB top-right, fans out 3-6 actions
    ActivityStatusPicker.tsx  Custom dropdown with coloured status dots
    BusinessSwitcher.tsx      Dropdown to switch active business
    NotificationBell.tsx      Bell + panel, realtime-subscribed, accept/decline buttons
    CreateTaskButton.tsx      Modal trigger (label prop = full button on tasks page, no label = icon)
    LiveActivityList.tsx      Realtime presence list in SidebarB

  dashboard/
    Cards.tsx                 Card, CardTitle, ProgressBar, Ring components
    RealtimeActivityTracker.tsx  Avatar + name + action sentence + dot, realtime

  tasks/
    TaskDetailDialog.tsx      Click any task -> dialog (description, dates, status, priority, assignee)

  marketing/
    HeroMockup.tsx            Fake dashboard preview in hero section
    LiveTicker.tsx            Animated activity feed on landing (updates every 4.5s)
    AnimatedCounter.tsx       Scroll-triggered count-up animation
    RoleCarousel.tsx          Interactive role explorer (click role to see what they see)

  organisation/
    InviteLinkRow.tsx         Shows invite URL + copy button for pending invitations

  forms/
    WizardSteps.tsx           Step indicator for signup wizard

  ui/
    button.tsx, input.tsx, label.tsx, card.tsx, dialog.tsx
    dropdown-menu.tsx, select.tsx, tabs.tsx, badge.tsx, avatar.tsx, etc.

supabase/
  migrations/
    0001_init.sql
    0002_rls.sql
    0003_profile_fks.sql
    0004_notifications.sql
  setup.sql     Combined — paste this into Supabase SQL Editor

scripts/
  seed.ts       npm run seed — creates 2 demo businesses + 20 users + tasks + events

proxy.ts        Next.js 16 proxy/middleware (must be named proxy.ts not middleware.ts)
```

---

## Key Features Explained

### Signup Wizard (5 steps)
1. Business details
2. Create account (+ partnership partners sub-step if business_type = partnership)
3. Add employees — optional, sends invitations
4. Calendar — informational only (in-app calendar, no OAuth)
5. Complete — `finalizeSignup()` uses admin client to create user + business + everything

Wizard state stored in base64 httpOnly cookie (`chrona-setup`) between steps.

### Invitation Flow
- Token stored in `invitations` table
- `supabase.auth.admin.inviteUserByEmail()` sends email (best-effort, fails silently if SMTP not configured)
- Fallback: `/organisation/members` shows copy-link button for every pending invitation
- `/invite/[token]` handles two flows:
  - Arrived via email link → already authenticated → set name + password only
  - Arrived via copy-paste → not authenticated → full signup + accept

### Task Acceptance Flow
1. Manager assigns task → `status = awaiting_acceptance`
2. API route `/api/notifications/create` creates notification for the assignee (service-role, bypasses RLS)
3. Employee sees bell badge, opens panel, clicks Accept or Decline
4. `/api/tasks/respond` — Accept: `status = pending` + notify assigner. Decline: `assigned_to = null, status = pending`

### Overworked Rule (lib/dashboard/heuristics.ts)
Based on task `start_at → end_at` hours over next 7 days:
- If anyone > 40h → flag ALL above 40h
- Else if anyone > 30h → flag ONLY the top one
- Else → no flag

### Priority Task Sort
Tasks sorted by nearest `due_date` regardless of priority level.
Colour: red = overdue/today, orange = ≤3 days, yellow = this week, green = later.

### Active Business Switching
- Cookie: `chrona-active-business`
- Server-side verified on every switch (must be active member)
- GUC set via `set_active_business()` for RLS row filtering

### Realtime Subscriptions
- `activity_status` → SidebarB "Team now" + dashboard live activity tracker
- `notifications` → bell badge + panel (accept/decline appears instantly)
- `tasks` → published but currently read on refresh (extend in v2)

### Collapsible Sidebars
- Both sidebars are client components with `useState` + `useEffect` (reads localStorage on mount)
- `chrona-sidebar-a` and `chrona-sidebar-b` in localStorage
- SidebarA: collapses to 68px icon strip, toggle button on **right** edge
- SidebarB: collapses to 48px status dot, toggle button on **left** edge
- Both `<aside>` have `relative` class so absolute-positioned buttons land correctly

---

## Seed Data

```bash
npm run seed
```

Creates:
- **Pixelforge Studio** — corporation, web design, 12 employees, 3 departments, 4 teams
- **Bella's Auto** — partnership, automotive, 8 employees, 2 partners, 2 pending approvals

**Password for all accounts:** `TestPass123!`

| Email | Role | Business |
|---|---|---|
| owner@pixelforge.test | Employer | Pixelforge |
| cto@pixelforge.test | C-Suite | Pixelforge |
| eng.lead@pixelforge.test | Manager | Pixelforge |
| frontend.lead@pixelforge.test | Team Lead | Pixelforge |
| dev1@pixelforge.test | Employee | Pixelforge |
| bella@bellasauto.test | Partner-Employer | Bella's Auto |
| marco@bellasauto.test | Partner-Employer | Bella's Auto |
| manager@bellasauto.test | Manager | Bella's Auto |

---

## Design System

**Light theme only.** Key CSS variables in `app/globals.css`:
```css
--background: #fafaf7;
--foreground: #0a0a14;
--card: #ffffff;
--primary: #4f46e5;       /* indigo */
--border: #e8e7e1;
--muted: #f5f5f1;
--muted-foreground: #6b7280;
```

Key CSS utility classes:
- `.gradient-text` — animated indigo gradient
- `.gradient-text-warm` — coral/rose gradient
- `.bg-mesh` — layered radial gradient background
- `.bg-dot-grid` — subtle dot pattern overlay
- `.bg-grid` — line grid overlay
- `.mask-fade` — fades edges with mask-image
- `.card-soft` — card with shadow + hover lift
- `.glow-primary` — indigo glow (primary buttons)
- `.border-gradient` — animated gradient border
- `.glass` — glass card (white/80 + backdrop blur)
- `.animate-fade-up` + `.delay-100` through `.delay-600`
- `.animate-float` / `.animate-float-slow`
- `.animate-blob` — morphing blob for background orbs
- `.animate-marquee` — horizontal scroll ticker
- `.mockup-tilt` — 3D perspective tilt on hero dashboard
- `.tilt-hover` — subtle 3D tilt on card hover
- `.shimmer` — skeleton loading shimmer

---

## npm Scripts

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm run typecheck  # tsc --noEmit
npm run seed       # Create demo data (needs SUPABASE_SERVICE_ROLE_KEY in .env.local)
```

---

## Deploy to Vercel

1. Push to GitHub: `git add -A && git commit -m "..." && git push`
2. Vercel → Add New Project → import repo
3. Add 3 env vars (URL, PUBLISHABLE_KEY, SERVICE_ROLE_KEY)
4. Deploy (~2 min)
5. Update Supabase Auth URL Configuration with Vercel URL
6. Optionally run `npm run seed` pointing at production DB

---

## What Is NOT in v1 (intentional)

- Google / Outlook calendar OAuth sync
- Documents & contracts module
- Training materials module
- Business verification / custom branding (logo, colour palette)
- AI assistant (button stub — shows "Coming soon")
- Generated reports (button stub — shows "Coming soon")
- Auto-detect activity status from calendar events
- Institution account type (schools, hospitals)
- Push notifications (web push)
- Mobile app

---

## After Fresh Clone — Manual Steps

1. Run `supabase/setup.sql` in Supabase SQL editor
2. Create `.env.local` with the 3 env vars
3. `npm install`
4. `npm run seed` (optional, for demo data)
5. Update Supabase Auth redirect URLs
6. `npm run dev`

Replace hand-written types once schema is live:
```bash
npx supabase gen types typescript --project-id <your-project-id> > lib/supabase/database.types.ts
```
