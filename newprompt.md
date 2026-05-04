# Chrona Business — Full Rebuild Prompt for Claude Code

> Paste this entire document into Claude Code as the first message of a new session inside the `chrona-work` repository.

---

## 0. Context for you (Claude Code)

You are working inside an existing Next.js + TypeScript + Supabase project at `Mishkat96/chrona-work`. The current app is an early scaffold. We are rebuilding it from the ground up against a finalised product spec. **You may delete and replace existing app code** — only the project tooling (Next.js config, Tailwind/PostCSS, tsconfig, package manager, Supabase client setup pattern) should be preserved and reused.

Stack:
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend / Auth / DB:** Supabase (Postgres + Auth + Row Level Security + Realtime + Storage)
- **Hosting:** Vercel
- **Email (invitations):** Supabase Auth's built-in email + magic links / invite flow

Read `CLAUDE.md` and `AGENTS.md` first if they exist, and follow any conventions defined there. After that, follow this spec.

---

## 1. What we are building

**Chrona Business** is an all-in-one workforce productivity platform for businesses. It replaces the patchwork of calendars, task managers, HR tools, and spreadsheets with one unified system that adapts to each role in a company.

**Scope for v1:**
- ✅ Businesses only (Self-Employed, Partnership, Corporation). **No institutions in v1.**
- ✅ Five-tier role system with cascading permissions
- ✅ Tasks, calendar, dashboards, real-time activity status
- ✅ Employee invitation by email link (not QR for v1)
- ❌ **Skip business verification step** (no document upload / branded customisation in v1)
- ❌ **Skip Documents & Records module entirely** in v1 (no contracts, training materials, warnings storage UI). Schema can leave room for it but no UI/routes.
- ❌ **No training-materials module in v1.**

The build must be **production-quality**: typed end-to-end, RLS-enforced, no client-side trust of role claims, clean component architecture, accessible, responsive, dark-mode aware.

---

## 2. Hard rules (non-negotiable)

1. **Multi-tenancy via Supabase RLS.** Every business-scoped table has a `business_id uuid not null` column. Every table has RLS policies that filter by the current user's business. A query from Business A must be physically incapable of returning Business B's rows.
2. **Role checks happen on the server / in RLS, never only on the client.** The client UI may hide buttons based on role, but every mutation must be re-validated server-side (RLS policy or server action check).
3. **No `any` in TypeScript.** Use generated Supabase types (`supabase gen types typescript`).
4. **Server Components by default.** Use Client Components only when interactivity, hooks, or browser APIs are required.
5. **Use Supabase Auth for everything authentication-related.** Do not roll a custom session.
6. **Realtime via Supabase Realtime channels** for activity status and task updates — not polling.
7. **Single source of truth for permissions.** Build one `lib/auth/permissions.ts` module that defines `can(user, action, resource)` and is used by both UI and server-side checks.
8. **Every destructive action confirms before firing.**
9. **No placeholder text like "Lorem ipsum" or "TODO: implement"** committed to main flows. Either build it or stub it behind a feature flag with a clear "Coming soon" UI.

---

## 3. Data model (Postgres / Supabase)

Create a fresh migration under `supabase/migrations/` that drops anything obsolete from earlier scaffolding and replaces it with the schema below. Use `pgcrypto` for `gen_random_uuid()`. All timestamps are `timestamptz default now()`.

### 3.1 Tables

**`businesses`**
- `id uuid pk default gen_random_uuid()`
- `name text not null`
- `founding_date date`
- `business_type text not null check (business_type in ('self_employed','partnership','corporation'))`
- `industry text` — free-text or enum (Automotive, Restaurant, Retail, Tech, Healthcare, Other)
- `services text` — short description
- `employee_count_estimate int`
- `team_count_estimate int`
- `partnership_requires_approval boolean default true` — only meaningful when `business_type = 'partnership'`
- `created_by uuid references auth.users(id)`
- `created_at timestamptz default now()`

**`profiles`** (1:1 with `auth.users`)
- `id uuid pk references auth.users(id) on delete cascade`
- `first_name text`
- `last_name text`
- `preferred_name text`
- `date_of_birth date`
- `gender text`
- `pronouns text`
- `personal_email text`
- `personal_phone text`
- `created_at timestamptz default now()`

**`business_members`** (the join table — a user can belong to multiple businesses)
- `id uuid pk default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `role text not null check (role in ('employer','c_suite','manager','team_lead','employee'))`
- `position text` — job title
- `department_id uuid references departments(id) on delete set null`
- `team_id uuid references teams(id) on delete set null`
- `date_joined date`
- `company_email text`
- `work_phone text`
- `is_owner boolean default false` — true for the original creator and partnership partners
- `contract_type text check (contract_type in ('full_time','contract_3m','contract_6m','contract_12m','custom')) default 'full_time'`
- `contract_end_date date` — null for full_time, set for contract types
- `status text default 'active' check (status in ('invited','active','suspended','removed'))`
- `created_at timestamptz default now()`
- unique(`business_id`, `user_id`)

**`departments`**
- `id uuid pk default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `name text not null`
- `description text`
- `created_at timestamptz default now()`

**`teams`**
- `id uuid pk default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `department_id uuid references departments(id) on delete set null` — null = team lives directly under the business (flat model from spec page 13)
- `name text not null`
- `description text`
- `created_at timestamptz default now()`

**`partners`** (only used when `business_type = 'partnership'`)
- `id uuid pk default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `user_id uuid not null references auth.users(id)`
- `share_percentage numeric(5,2)` — for majority-shareholder logic
- `created_at timestamptz default now()`

**`approval_requests`** (the partnership / structural-change approval workflow)
- `id uuid pk default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `requested_by uuid not null references auth.users(id)`
- `action_type text not null` — e.g. 'add_department', 'remove_team', 'modify_member_role'
- `payload jsonb not null` — the proposed change
- `status text default 'pending' check (status in ('pending','approved','rejected','expired'))`
- `decided_by uuid references auth.users(id)`
- `decided_at timestamptz`
- `created_at timestamptz default now()`

**`tasks`**
- `id uuid pk default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `title text not null`
- `description text`
- `priority text default 'normal' check (priority in ('low','normal','high','urgent'))`
- `status text default 'pending' check (status in ('pending','in_progress','completed','cancelled','awaiting_approval'))`
- `assigned_to uuid references auth.users(id) on delete set null`
- `assigned_team_id uuid references teams(id) on delete set null`
- `assigned_department_id uuid references departments(id) on delete set null`
- `created_by uuid not null references auth.users(id)`
- `due_date timestamptz`
- `start_at timestamptz` — when the task is scheduled to start
- `end_at timestamptz` — scheduled end
- `completed_at timestamptz`
- `requires_approval boolean default false`
- `approved_by uuid references auth.users(id)`
- `created_at timestamptz default now()`
- index on (`business_id`, `assigned_to`, `status`)
- index on (`business_id`, `due_date`)

**`activity_status`** (current presence — one row per member, upserted)
- `business_member_id uuid pk references business_members(id) on delete cascade`
- `status text not null default 'available' check (status in ('available','tasking','meeting','lunch_break','personal_time','training','offline'))`
- `updated_at timestamptz default now()`

**`activity_log`** (history for analytics — append-only)
- `id uuid pk default gen_random_uuid()`
- `business_member_id uuid not null references business_members(id) on delete cascade`
- `business_id uuid not null references businesses(id) on delete cascade`
- `status text not null`
- `started_at timestamptz not null default now()`
- `ended_at timestamptz`

**`calendar_events`**
- `id uuid pk default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `owner_id uuid not null references auth.users(id) on delete cascade`
- `title text not null`
- `event_type text default 'meeting' check (event_type in ('meeting','task_block','break','lunch','training','focus','other'))`
- `start_at timestamptz not null`
- `end_at timestamptz not null`
- `task_id uuid references tasks(id) on delete set null`
- `external_provider text check (external_provider in ('google','outlook'))` — null if native
- `external_id text` — for sync dedup
- `created_at timestamptz default now()`
- index on (`business_id`, `owner_id`, `start_at`)

**`invitations`**
- `id uuid pk default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `email text not null`
- `role text not null check (role in ('employer','c_suite','manager','team_lead','employee'))`
- `department_id uuid references departments(id) on delete set null`
- `team_id uuid references teams(id) on delete set null`
- `position text`
- `contract_type text default 'full_time'`
- `contract_end_date date`
- `token text not null unique` — random URL-safe token
- `invited_by uuid not null references auth.users(id)`
- `accepted_at timestamptz`
- `expires_at timestamptz default (now() + interval '14 days')`
- `created_at timestamptz default now()`

**`multi_function_button_config`**
- `user_id uuid pk references auth.users(id) on delete cascade`
- `business_id uuid not null references businesses(id) on delete cascade`
- `actions jsonb not null default '[]'::jsonb` — array of up to 6 action keys

### 3.2 Helper SQL functions

Create these `security definer` functions in `public` schema:

- `current_business_id()` → returns the `business_id` from the current session's JWT custom claim or from a `business_members` row matching `auth.uid()`. Use a session variable approach (set via a server action when user picks active business).
- `current_user_role(p_business_id uuid)` → returns the role of `auth.uid()` in that business.
- `is_role_at_or_above(p_business_id uuid, p_role text)` → boolean. Role hierarchy: employer > c_suite > manager > team_lead > employee.

### 3.3 Row Level Security

Enable RLS on every table. Write policies for `select`, `insert`, `update`, `delete` separately. Examples to follow:

- `business_members`: A user can `select` rows where `business_id` matches one of their memberships. Only `employer` or `c_suite` can `insert` or `update` other members. A user can `update` their own profile fields but not their own role.
- `tasks`: `select` allowed if user is in the same business. `insert` allowed for employee+ on themselves, and team_lead+ on their team. `update` to mark complete allowed for assignee. `update` of `requires_approval` flow gated by `is_role_at_or_above(..., 'team_lead')`.
- `calendar_events`: `select` allowed for same business. `insert/update/delete` allowed for the owner; team_lead+ can also write events for members below them.
- `activity_status`: A user can only `update` their own row.
- `approval_requests`: `select` allowed for partners of that business; `update` to approve/reject only by partners.

Document every policy with a SQL comment explaining its intent.

---

## 4. Application architecture

### 4.1 Folder layout

```
app/
  (marketing)/                       # public landing page, login, signup
    page.tsx                         # landing
    login/page.tsx
    signup/
      page.tsx                       # business signup wizard entry
      business/page.tsx              # step 1
      account/page.tsx               # step 2
      employees/page.tsx             # step 3 (skip allowed)
      calendar/page.tsx              # step 4 (skip allowed)
      complete/page.tsx
    invite/[token]/page.tsx          # employee invitation acceptance
  (app)/                             # authenticated app
    layout.tsx                       # SidebarA + SidebarB shell
    dashboard/page.tsx
    tasks/page.tsx
    tasks/[id]/page.tsx
    calendar/page.tsx                # default = today + current progression
    calendar/week/page.tsx
    calendar/month/page.tsx
    organisation/
      page.tsx                       # overview
      departments/page.tsx
      teams/page.tsx
      members/page.tsx
      members/[id]/page.tsx
    settings/
      page.tsx
      profile/page.tsx
      business/page.tsx
      multi-function-button/page.tsx
    approvals/page.tsx               # partnership approval queue
  api/
    invitations/accept/route.ts
    realtime/presence/route.ts       # if needed for any non-Realtime fallback
components/
  shell/
    SidebarA.tsx
    SidebarB.tsx
    MultiFunctionButton.tsx
    ActivityStatusPicker.tsx
  dashboard/
    PrimaryDashboard.tsx
    SecondaryDashboard.tsx
    TertiaryDashboard.tsx
    ViewerDashboard.tsx
    CompanyProgressBar.tsx
    ProgressRings.tsx
    EfficientEmployeesCard.tsx
    OverworkedEmployeesCard.tsx
    LiveActivityTracker.tsx
  tasks/
    TaskCard.tsx
    PrimaryTaskTab.tsx
    SecondaryTaskTab.tsx
    TodayCalendarStrip.tsx
    IncomingTasksPanel.tsx
    AvailableWindowsPanel.tsx
    AssignTaskDialog.tsx
  calendar/
    TodayView.tsx
    WeekView.tsx
    MonthView.tsx
    CurrentProgression.tsx
  organisation/
    DepartmentTree.tsx
    TeamCard.tsx
    MemberRow.tsx
    AddMemberDialog.tsx
  forms/                             # shared form primitives
  ui/                                # buttons, inputs, dialog, dropdown, tabs, etc.
lib/
  supabase/
    client.ts                        # browser client
    server.ts                        # server client (cookies)
    admin.ts                         # service-role client (server-only)
    types.ts                         # generated types — re-export
  auth/
    permissions.ts                   # can(user, action, resource)
    roles.ts                         # role hierarchy constants
    session.ts                       # getCurrentUser, getActiveBusiness
  business/
    setup.ts
    invitations.ts
  tasks/
    queries.ts
    mutations.ts
    recommendations.ts               # smart assign suggestions (heuristic in v1)
  calendar/
    windows.ts                       # available-window computation
    google.ts                        # OAuth + sync (stub OK for v1, but wire OAuth)
    outlook.ts                       # stub OK for v1
  realtime/
    presence.ts
supabase/
  migrations/
    0001_init.sql
    0002_rls.sql
    0003_seed_helpers.sql
  seed.sql                           # fake users + data for testing (see §7)
```

### 4.2 Supabase clients

Three distinct clients in `lib/supabase/`:
- `client.ts` — `createBrowserClient` from `@supabase/ssr`, used in Client Components.
- `server.ts` — `createServerClient` from `@supabase/ssr`, reads/writes cookies, used in Server Components, Route Handlers, and Server Actions.
- `admin.ts` — `createClient` with the **service role key** for trusted server-only operations (seeding, sending invitations). **Never import this in a Client Component.** Add an `import "server-only"` at the top.

### 4.3 Permissions module — `lib/auth/permissions.ts`

Implement and export:

```ts
type Role = 'employer' | 'c_suite' | 'manager' | 'team_lead' | 'employee';
const ROLE_RANK: Record<Role, number> = {
  employer: 5, c_suite: 4, manager: 3, team_lead: 2, employee: 1,
};

type Action =
  | 'business.update' | 'business.delete'
  | 'department.create' | 'department.update' | 'department.delete'
  | 'team.create' | 'team.update' | 'team.delete'
  | 'member.add' | 'member.remove' | 'member.update_role'
  | 'task.create' | 'task.assign' | 'task.approve' | 'task.complete' | 'task.delete'
  | 'calendar.write_others'
  | 'approval.decide'
  | 'multi_function_button.customise';

export function can(role: Role, action: Action, scope?: 'self' | 'team' | 'department' | 'company'): boolean { /* ... */ }
export function isAtOrAbove(role: Role, min: Role): boolean { return ROLE_RANK[role] >= ROLE_RANK[min]; }
```

The `can` function is the single place permission rules live. Both UI (to hide buttons) and Server Actions (to gate mutations) call this. RLS is the third layer of defence.

---

## 5. Feature requirements

### 5.1 Sign-up flow (5 steps)

1. **Business details:** name, founding date, business type (radio: Self-Employed / Partnership / Corporation), industry (select: Automotive / Restaurant / Retail / Tech / Healthcare / Other), services (textarea), employee count estimate, team count estimate.
2. **Create your account:** First name, last name, preferred name, DOB, gender, pronouns, personal email, personal phone. **Plus:** company position, team/department (skippable here), date joined, company email, work phone. **Checkbox: "I am the owner of this business."** If business type = Partnership, after this step show the **"Add your partners"** sub-step (email + share percentage rows) before continuing.
3. **Add employees (skippable):** Form to add multiple employees in a list. Each row: first name, last name, personal email (where invitation goes), role (dropdown), department, team, position, contract type (Full-time / 3-month / 6-month / 12-month / Custom date), date joined. On save → creates `invitations` rows and sends email via Supabase Auth's invite-by-email or a custom magic-link route.
4. **Connect calendar (skippable):** Buttons for "Connect Google Calendar" and "Connect Outlook" — wire OAuth. If skipped, user lands in the app with no external calendar; native calendar still works.
5. **Setup complete** → redirect to `/dashboard`.

The wizard stores progress in the URL (step query param) and is resumable. Use Server Actions for each save.

### 5.2 Invitation acceptance flow (`/invite/[token]`)

- Token is verified server-side, not expired, not accepted.
- If user not signed in → present sign-up form pre-filled with email; on completion creates `auth.users` row, `profiles` row, `business_members` row with role+department+team from invitation, marks invitation accepted.
- If user signed in with same email → confirm and accept in one click.
- Token mismatch / expired → friendly error page.

### 5.3 Active-business switcher

A user might belong to multiple businesses. Top-left of SidebarA shows the active business name + dropdown to switch. Switching updates a server-side cookie and re-renders.

### 5.4 Dashboard (4 variants by role)

Single route `/dashboard` reads the user's role and renders the right variant Server Component:

- **Primary (employer):** company-wide progress bar at top, three progress rings (Departments / Teams / C-Suite & Employees), efficient-employees card, overworked-employees card, schedule optimisation suggestions card, live activity tracker (real-time list of who's active and on what).
- **Secondary (c_suite, manager):** progress bar scoped to teams/departments they oversee, three rings (Personal / All teams under them / Departments under them), same recognition + overworked + optimisation cards scoped down, real-time activity tracker for their scope.
- **Tertiary (team_lead):** progress bar scoped to their team, three rings (Personal / Own team / Own department), same cards scoped to their team.
- **Viewer (employee):** progress bar of their own active tasks completed, three rings (Personal / Own team / Own department — read-only), recommendations of work to complete with priority levels, upcoming tasks, improvement opportunities, real-time activity status.

For v1, "efficient", "overworked", and "schedule optimisation" can be **heuristic-based**, not ML — e.g. efficient = highest task completion rate this week; overworked = highest scheduled hours next 7 days. Document these heuristics in `lib/dashboard/heuristics.ts`.

### 5.5 Sidebars

**SidebarA (left, collapsible):** Company logo (top), Tasks, Calendar, Organisation, Approvals (only visible if there are pending approvals for this user), Settings, Profile, Log out. Bottom edge: small avatar + name. Use icons + labels when expanded; icons-only when collapsed.

**SidebarB (right, collapsible):** Activity status (with colour pill + dropdown to change — see §5.7), Personal tasks for the day, Suggested tasks, Active work in progress (mine), Active employees right now (live). Updates via Supabase Realtime channels.

Both sidebars persist their open/closed state in `localStorage`.

### 5.6 Multi-function button

Floating button top-right of every authenticated page. Default 3 actions: Create/Approve/Deny task, Talk to AI assistant (stub for v1 — show "Coming soon" toast), Generate report (stub for v1). Settings page lets user customise up to 6 total. If user has not customised, the 3 default buttons appear; if they customise, only their custom ones show. Stored in `multi_function_button_config`.

### 5.7 Activity status

Six statuses with the exact colours from the spec:
- Available: green (#22c55e)
- Tasking: yellow (#eab308)
- Meeting: orange (#f97316)
- Lunch / Break: blue (#3b82f6)
- Personal Time: red (#ef4444)
- Training: grey (#6b7280)

On login, status auto-set to Available. Manual change via dropdown in SidebarB. Each change writes to `activity_status` (upsert) and appends to `activity_log` (close previous span, open new). Other users in the same business see updates in real time via a Supabase Realtime channel keyed on `business_id`.

When SidebarB is collapsed, only the colour dot shows next to the user avatar across the app.

### 5.8 Tasks

**Primary Task Tab** (employer/c_suite/manager/team_lead view):
- Top: Priority tasks (3 cards horizontal): name, turnaround date, coloured status dot (red = overdue/urgent, orange = due soon, yellow = due this week, green = on track).
- Middle: **Today's task calendar** — horizontal time-block strip from 9am to whatever the last block ends, showing each block coloured by activity type (orange = meeting, blue = break/lunch, yellow = tasking, etc.). Below it, "Tasks completed: X | Tasks remaining: Y."
- Below: Two columns —
  - **Incoming tasks**: list of tasks awaiting approval. Each row: task name + Approve / Deny buttons.
  - **Available windows**: computed gaps in their + their team's calendar for the next 7 days, e.g. "Today 2–3pm", "Tomorrow 1–4pm", "June 15th 10–12pm".
- Below: **Assign tasks** — two side-by-side panels:
  - **Recommendations**: each unassigned task → suggested assignee/team based on workload heuristic.
  - **Assign manually**: each unassigned task → dropdown picker.
- Below: **Recent activity** feed.

**Secondary Task Tab** (employee view):
- Today's tasks list with time blocks
- Visual: which task is in progress (yellow highlight), which is up next (blue indicator), which is highest priority (red flag).
- Personal calendar week + month at a glance.
- Upcoming work + improvement opportunities (e.g. "You completed all tasks early — try taking on a stretch task").

### 5.9 Calendar

**Default landing on `/calendar`:** Today's view + Current Progression panel below it. Then tabs: Today / Week / Month.

- **Today:** horizontal time-block strip (same as task tab) + Current Progression strip showing where the user actually is right now (filled vs unfilled blocks), with the live indicator on the current block.
- **Week:** 7 day columns, time on Y axis (8am–10pm). Each block coloured by activity type. Days off shown as red column ("Not avail").
- **Month:** 7-column grid, each cell showing tiny coloured stripes for that day's activity mix. Days off filled solid red.
- **Available windows panel** (right side on Today/Week): "1st June Monday — 2 hours 30 mins" etc. Each row clickable → opens "Book on calendar" dialog that creates a `calendar_events` row.

Google/Outlook sync: implement OAuth flows; store tokens in a `calendar_integrations` table (add to schema if missing). Two-way sync stub: pull events on demand, write events when user creates them. **Pull is required for v1; push can be a v1.1 polish item if time-tight — but wire the OAuth.**

### 5.10 Organisation

- **Departments** page: list, add, rename, delete (with approval workflow for partnerships if `partnership_requires_approval = true`).
- **Teams** page: list, add (optionally inside a department), rename, delete.
- **Members** page: searchable, filterable by team / department / role. Click a member → details page with their info, contract details, role, status, recent tasks, and (for managers+) buttons to change role / move team / suspend / remove.
- **Add Member Dialog**: same fields as employee invitation in setup wizard. Sends invitation email.

### 5.11 Partnership approval queue (`/approvals`)

Visible only when there's a pending approval. List of pending requests with action type, payload summary, requester, requested at. Approve / Reject buttons. Approving the request executes the action server-side using the `payload`.

### 5.12 Settings

- **Profile**: edit personal info (the page-5 fields from spec).
- **Business**: edit business info (employer-only). Industry, services, etc.
- **Multi-function button**: drag-and-drop or simple list to pick up to 6 actions.

### 5.13 Landing page

Simple, clean marketing landing at `/`. Hero with the one-sentence pitch ("An all-in-one workforce platform that gives every role in a company exactly the tools, visibility, and access they need..."), three feature blocks, and a CTA to `/signup`. Don't over-engineer — production-quality but not the focus of this rebuild.

---

## 6. Realtime

Use Supabase Realtime for:
- **Activity status changes** — broadcast on a `business:{business_id}:presence` channel.
- **Task updates** — broadcast on `business:{business_id}:tasks` when a task is created, assigned, or status changes.
- **Approval requests** — broadcast on `business:{business_id}:approvals`.

Subscribe in the relevant Client Components and update local state.

---

## 7. Seed data for testing

Create `supabase/seed.sql` (and a companion `scripts/seed.ts` if needed for users that must go through Supabase Auth Admin API) that produces a realistic test dataset.

**Use the Supabase Auth Admin API** (`supabase.auth.admin.createUser`) for the auth users, since they need real `auth.users` rows. Wrap this in a Node script `scripts/seed.ts` that reads the service-role key from `.env.local` and:

### 7.1 Two test businesses

**Business A — "Pixelforge Studio" (Corporation, web design agency, ~12 employees)**
**Business B — "Bella's Auto" (Partnership, automotive repair shop, 2 partners + 6 employees, `partnership_requires_approval = true`)**

### 7.2 Test users (all with password: `TestPass123!`)

For Pixelforge Studio:
| Email | Role | Position | Team / Dept |
|---|---|---|---|
| owner@pixelforge.test | employer | Founder & CEO | — |
| cto@pixelforge.test | c_suite | CTO | Engineering Dept |
| coo@pixelforge.test | c_suite | COO | — |
| design.lead@pixelforge.test | manager | Design Manager | Design Dept |
| eng.lead@pixelforge.test | manager | Eng Manager | Engineering Dept |
| frontend.lead@pixelforge.test | team_lead | Frontend Team Lead | Frontend Team / Engineering |
| designer1@pixelforge.test | employee | Senior Designer | Design Dept |
| designer2@pixelforge.test | employee | Designer | Design Dept |
| dev1@pixelforge.test | employee | Frontend Dev | Frontend Team / Engineering |
| dev2@pixelforge.test | employee | Backend Dev | Backend Team / Engineering |
| dev3@pixelforge.test | employee | Frontend Dev | Frontend Team / Engineering |
| sales1@pixelforge.test | employee | Sales | Sales Dept |

For Bella's Auto:
| Email | Role | Notes |
|---|---|---|
| bella@bellasauto.test | employer | Partner, 60% share |
| marco@bellasauto.test | employer | Partner, 40% share |
| manager@bellasauto.test | manager | Shop Manager |
| mech1@bellasauto.test | employee | Senior Mechanic |
| mech2@bellasauto.test | employee | Mechanic |
| mech3@bellasauto.test | employee | Junior Mechanic |
| frontdesk@bellasauto.test | employee | Front Desk |
| apprentice@bellasauto.test | employee | Apprentice — contract_3m |

### 7.3 Seed data per business

For each business:
- 2–3 departments and 4–6 teams across them
- ~30 tasks spanning past 2 weeks and next 2 weeks, with realistic distribution: 40% completed, 20% in progress, 30% pending, 10% awaiting approval. Mix priorities. Mix assignees (some unassigned for the assignment tab to show recommendations).
- ~40 calendar events per business across the next 2 weeks: meetings, focus blocks, breaks, lunches.
- Current `activity_status` values randomly distributed across the 6 statuses.
- For Bella's Auto: 2 pending `approval_requests` (e.g. "Add new department: Detailing", "Change Marco's role to manager").

The seed script must be **idempotent** — running it twice should not create duplicates. Use `on conflict do nothing` and check existence before creating auth users.

Add an npm script: `"seed": "tsx scripts/seed.ts"`.

After seeding, print to console:
```
✅ Seeded 2 businesses, 20 users, X tasks, Y events
🔑 Login with any of these (password: TestPass123!):
   - owner@pixelforge.test (Employer, Pixelforge Studio)
   - bella@bellasauto.test (Partner-Employer, Bella's Auto)
   - dev1@pixelforge.test (Employee, Frontend Team)
   ...
```

---

## 8. Tech setup checklist

1. Install/verify dependencies:
   ```
   @supabase/supabase-js @supabase/ssr
   tailwindcss @tailwindcss/forms
   lucide-react
   date-fns
   zod
   react-hook-form @hookform/resolvers
   tsx (devDep, for seed script)
   server-only
   ```
2. `.env.local` (don't commit) — document all required keys in `.env.example`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   GOOGLE_OAUTH_CLIENT_ID=
   GOOGLE_OAUTH_CLIENT_SECRET=
   MICROSOFT_OAUTH_CLIENT_ID=
   MICROSOFT_OAUTH_CLIENT_SECRET=
   ```
3. Run `supabase gen types typescript --project-id <id> > lib/supabase/database.types.ts` and re-export from `lib/supabase/types.ts`.
4. Configure Vercel: ensure all env vars set in Vercel dashboard before deploying.

---

## 9. Build order (do it in this order, commit after each)

1. **Wipe and rewrite the schema** — write `0001_init.sql` and `0002_rls.sql`. Run locally against Supabase. Generate types.
2. **Auth + active-business switcher** — login, signup entry, session helpers, middleware that redirects unauthenticated users.
3. **Signup wizard (5 steps)** — including partnership partner sub-step.
4. **Invitation accept flow.**
5. **App shell** — `(app)/layout.tsx` with both sidebars, top bar, multi-function button stub.
6. **Permissions module + role-based dashboard router** — render the four dashboard variants (start with skeletons, fill in cards next).
7. **Organisation pages** — departments, teams, members, add-member dialog, with approval workflow for partnerships.
8. **Tasks** — both task tabs, create/assign/approve, recommendations, available-windows panel.
9. **Calendar** — today, week, month, available-windows, native event creation. Wire Google OAuth + read-only sync. Outlook OAuth stub.
10. **Activity status + Realtime** — write status, subscribe, render in SidebarB and across member rows.
11. **Approvals queue.**
12. **Settings (profile, business, multi-function button).**
13. **Seed script + manual smoke test with all role types.**
14. **Polish:** dark mode, mobile responsiveness, empty states, loading states, error boundaries.

After each step: run `tsc --noEmit`, run `next build`, and commit. Do not move to the next step with build errors.

---

## 10. What "done" looks like

- I can sign up a new business, walk through all 5 steps, land on a tailored dashboard.
- I can run `npm run seed`, log in as `owner@pixelforge.test`, see the Primary dashboard with realistic data, switch to `dev1@pixelforge.test`, see the Viewer dashboard with only their tasks.
- I can log in as `bella@bellasauto.test`, see 2 pending approvals, approve one, see it execute (e.g. department actually gets added).
- Activity status updates on one user reflect in real time on another user's screen in the same business.
- A user from Pixelforge cannot, via any URL or API call, see Bella's Auto's data — confirmed by attempting to fetch by ID directly.
- `next build` passes with no TypeScript errors. `next dev` runs cleanly.
- The app deploys to Vercel without runtime errors.

---

## 11. Things to ask me about before you build, if unclear

If anything in this spec is genuinely ambiguous (not just incomplete — incomplete is fine, you decide reasonably), stop and ask. Otherwise, proceed.

When you finish each numbered step in §9, give me a one-line status update and wait for my "go" before the next step. This lets me catch course corrections early.

**Begin with §9 step 1.**