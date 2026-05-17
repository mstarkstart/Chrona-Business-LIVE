# Chrona Business — Full Handover Document

This document covers every feature of the app from the user's perspective and the developer's perspective. Read it fully before touching any code.

---

## Table of Contents

1. [What the App Does](#1-what-the-app-does)
2. [User Roles and What Each Can Do](#2-user-roles-and-what-each-can-do)
3. [Public Pages — Before Login](#3-public-pages--before-login)
4. [Signup Wizard — Creating a Business](#4-signup-wizard--creating-a-business)
5. [Login and Session Handling](#5-login-and-session-handling)
6. [App Shell — Layout, Sidebars, and Navigation](#6-app-shell--layout-sidebars-and-navigation)
7. [Dashboard](#7-dashboard)
8. [Tasks](#8-tasks)
9. [Calendar](#9-calendar)
10. [Organisation](#10-organisation)
11. [Approvals](#11-approvals)
12. [Settings](#12-settings)
13. [Notifications](#13-notifications)
14. [Activity Status and Live Presence](#14-activity-status-and-live-presence)
15. [Multi-Function Button](#15-multi-function-button)
16. [Inviting New Members](#16-inviting-new-members)
17. [Multi-Business Support](#17-multi-business-support)
18. [Database Tables](#18-database-tables)
19. [How Auth and Security Works](#19-how-auth-and-security-works)

---

## 1. What the App Does

Chrona Business is a SaaS platform for managing small businesses. One business owner signs up, creates their company, and invites their employees. From then on, everyone uses the platform to:

- Assign and track tasks through a full lifecycle
- See who is doing what in real time
- Schedule and view calendar events
- Manage departments, teams, and members
- Get notified when tasks are assigned or responded to
- Approve or reject structural changes (partnerships only)

The app is role-aware — what you see and what you can do depends entirely on your role in the business.

---

## 2. User Roles and What Each Can Do

There are five roles, ranked from most to least powerful:

| Role | Rank | Who it represents |
|---|---|---|
| `employer` | 5 | Business owner, full control |
| `c_suite` | 4 | Executives, cross-department visibility |
| `manager` | 3 | Department managers |
| `team_lead` | 2 | Team leaders |
| `employee` | 1 | Regular staff |

The rule is simple: **a role can do anything their rank or above can do**. All permission checks go through `lib/auth/permissions.ts`. Here is every action and the minimum role needed:

| Action | Minimum Role |
|---|---|
| Update business info | employer |
| Delete business | employer |
| Decide on approvals | employer |
| Create department | manager |
| Update department | manager |
| Delete department | c_suite |
| Create team | manager |
| Update team | team_lead |
| Delete team | manager |
| Invite members | c_suite |
| Remove members | c_suite |
| Change member role | c_suite |
| Create task | employee (everyone) |
| Assign task to someone | team_lead |
| Approve task start | team_lead |
| Complete task | employee (everyone) |
| Delete task | team_lead |
| Customise multi-function button | employee (everyone) |

The same rules are enforced a second time at the database level via Row-Level Security (RLS) in Supabase, so even if someone bypasses the UI, the database will reject the query.

---

## 3. Public Pages — Before Login

### Landing Page (`/`)
The marketing homepage. It shows a hero section with a dashboard mockup, animated counters (employees onboarded, tasks completed, etc.), a role carousel where you can click each role to see what they would see, and a live activity ticker showing fake real-time events. There are two calls to action: "Sign in" and "Get started" (signup). The navbar is floating and frosted.

### Login Page (`/login`)
Standard email + password form. On submit it calls `supabase.auth.signInWithPassword()` then redirects to `/dashboard` (or wherever the user was trying to go via the `?next=` query param).

**Session detection built in:** If you visit `/login` while already signed in with a valid session and active memberships, you are immediately redirected to `/dashboard`. If you are signed in but your account has no business memberships (e.g. a stale or test account), the page shows a "Wrong account?" screen with a sign-out button so you can log in with the correct account. This prevents the loop where an old session sends you to `/signup`.

---

## 4. Signup Wizard — Creating a Business

New businesses are created through a 5-step wizard. The wizard state (all the form data) is stored in an encrypted cookie (`chrona-setup`) between steps, so nothing is written to the database until the final step.

### Step 1 — Business Details (`/signup/business`)
- Business name, founding date, business type (self-employed / partnership / corporation), industry, services, estimated employee and team count
- Business type matters: if you choose "partnership", the approval flow is enabled later

### Step 2 — Your Account (`/signup/account`)
- First name, last name, email, password
- If business type is "partnership", an extra sub-step appears to add partner details (name, email, ownership percentage). Partners must add up to exactly 100%.

### Step 3 — Add Employees (`/signup/employees`)
- Optional. Add up to 10 employee email addresses at this stage.
- These become pending invitations — the employees receive a sign-up link.
- This step can be skipped entirely.

### Step 4 — Calendar Info (`/signup/calendar`)
- Informational only. Explains that Chrona has an in-app calendar. No OAuth connection at this stage.

### Step 5 — Complete (`/signup/complete`)
- The "Create my business" button triggers `finalizeSignup()` in `lib/business/finalize.ts`
- This uses the admin Supabase client (service role) to:
  1. Create the auth user with the email and password
  2. Create the business record
  3. Create the `business_members` row linking the owner to the business
  4. Create partner records if it's a partnership
  5. Send invitation emails to any employees added in step 3
  6. Sign the user in immediately
  7. Redirect to `/dashboard`

If email sending fails (SMTP not configured), it fails silently — the invitation link can still be copied from the Members page instead.

---

## 5. Login and Session Handling

### How sessions work
Supabase uses two cookies: an `access_token` (expires in 1 hour) and a `refresh_token` (long-lived). The file `proxy.ts` runs on every request. It calls `supabase.auth.getUser()`, which automatically refreshes the access token if it has expired. The refreshed cookies are forwarded with every subsequent response, so sessions stay alive seamlessly without the user having to log in again.

### Protected routes
The following paths require a login. If you visit them without a session, you are redirected to `/login?next=/the-page-you-wanted`:
- `/dashboard`
- `/tasks`
- `/calendar`
- `/organisation`
- `/approvals`
- `/settings`

The redirect back to the intended page happens automatically after login via the `?next=` param.

### Logout
The logout button is in the bottom of the left sidebar. It calls `supabase.auth.signOut()` and redirects to `/login`.

---

## 6. App Shell — Layout, Sidebars, and Navigation

Once logged in, every page is wrapped in a layout (`app/(app)/layout.tsx`) that renders:

### Left Sidebar (SidebarA)
- Chrona Business logo — clicking it goes to `/dashboard`
- Business switcher (dropdown to switch between multiple businesses if the user belongs to more than one)
- Navigation links: Dashboard, Tasks, Calendar, Organisation, Settings
- If there are pending approval requests, an "Approvals (N)" link appears automatically
- User info at the bottom with a hover-revealed logout button
- Can be collapsed to icon-only mode — state saved in `localStorage`

### Right Sidebar (SidebarB)
- Your activity status picker (available, tasking, meeting, etc.)
- In progress tasks — tasks you have currently started
- Today's tasks — tasks due today
- Suggested tasks — unassigned tasks that need someone
- Team now — live list of who is online and their current status
- Can be collapsed — state saved in `localStorage`

### Top Bar
- Notification bell with unread count badge (top-right of the main content area)
- The floating multi-function button (FAB) sits in the very top-right corner of the screen

---

## 7. Dashboard

The dashboard is role-aware — every role sees a different emphasis.

### All roles see:
- **Progress bar** — "Company progress", "Team progress", or "My progress" depending on role. Shows completed vs total tasks as a percentage. Clicking it goes to `/tasks`.
- **Three ring charts** — Personal progress, aggregate team/company progress, and a department/organisation ring.
- **Priority tasks** — Up to 6 tasks sorted by nearest deadline. Each one is a link to the task detail page. Colour-coded: red = overdue, orange = due in ≤3 days, yellow = this week, green = later.
- **Live activity tracker** — Real-time card at the bottom showing everyone's current status, updated via Supabase Realtime without page refresh.

### Employer / C-Suite also see:
- **Most efficient (last 7 days)** — employees ranked by tasks completed, clicking goes to `/organisation/members`
- **Most loaded (next 7 days)** — employees ranked by total scheduled hours. If anyone is above 40h, a warning is shown.

### Employee also sees:
- **My upcoming tasks** — personal task list sorted by due date with a "See all" link

---

## 8. Tasks

### Tasks List Page (`/tasks`)

**What it shows depends on your role:**

- **Primary roles** (employer, c_suite, manager, team_lead): see all company tasks. The page shows priority task cards at the top, a "Today" summary bar, an "Awaiting approval" section, available scheduling windows, smart assignment recommendations, and a manual assign panel.
- **Secondary roles** (employee): see their own tasks only, with Start and Done buttons.

**Priority task cards** (top 3 by nearest deadline): each card is clickable and links to the task detail page.

**Task status flow:**
```
pending  →  awaiting_acceptance  →  in_progress  →  completed
                                  ↓
                               cancelled
                                  ↑
             awaiting_approval  ──┘ (if requires_approval is checked)
```

**Awaiting approval section** (primary roles): tasks that have `requires_approval = true` and status `awaiting_approval`. Managers can Approve (→ `in_progress`) or Deny (→ `cancelled`).

**Assign manually panel** (primary roles): shows up to 5 unassigned tasks. Lets you pick a team member from a dropdown and assign them.

**Smart recommendation**: The system looks at all active members and suggests whoever has the least tasks currently assigned. Shown as a text hint above the manual assign panel.

**Available windows**: Lists free time slots (9am–6pm) over the next 7 days when no calendar events are scheduled, to help decide when to assign work.

### Create Task
The "Create task" button opens a modal with:
- Title (required)
- Description (optional)
- Priority: Low / Normal / High / Urgent
- Assign to: dropdown of all active members (if assigned, status becomes `awaiting_acceptance`)
- Due date (datetime picker)
- Start date (datetime picker)
- Requires approval checkbox: if checked, employee must request approval before it moves to in_progress

When a task is assigned, the assignee gets a notification immediately.

### Task Detail Page (`/tasks/[id]`)
Each task has its own page at `/tasks/ID`. Shows all task fields: title, status badge, priority badge, description, due date, start date, assignee, created date. Has a "Back to tasks" link. This page URL can be shared directly with an employee.

---

## 9. Calendar

Three views available: Today, Week, Month.

### Today View (`/calendar`)
- Lists all calendar events for the current day
- Shows a progress bar: "X% of today's blocks complete" based on elapsed time vs total scheduled time
- Shows available free windows over the next 7 days
- Has a "New event" form: title, type (meeting / task block / break / lunch / training / focus / other), start datetime, end datetime

### Week View (`/calendar/week`)
- Grid view: 7 columns (Sun–Sat), time axis from 8:00 to 22:00
- Events rendered as coloured blocks positioned by their actual start time and duration
- Colour coding: meeting = orange, task_block = yellow, break/lunch = blue, training = grey, focus = purple

### Month View (`/calendar/month`)
- Shows the current month as a grid
- Each day cell shows the event titles for that day

Events are personal — each user sees only their own events.

---

## 10. Organisation

The organisation section has four sub-pages.

### Overview (`/organisation`)
Shows counts: number of departments, teams, and active members. Each count is a card that links to the sub-page.

### Departments (`/organisation/departments`)
- Lists all departments for the active business
- C-suite and above can add a new department (text input + Add button)
- **Partnership exception**: if the business is a partnership with `partnership_requires_approval = true`, creating a department does NOT happen immediately. Instead, an approval request is created and must be approved by the employer via the Approvals page before the department is actually created.
- C-suite and above can delete departments

### Teams (`/organisation/teams`)
- Lists all teams with their parent department shown
- Managers and above can create teams (name + optional department selector)
- Managers and above can delete teams

### Members (`/organisation/members`)
- Lists all active members with their role, position, department, and team
- Each member row has a "View" link to their detail page
- C-suite and above see an invite form at the top (email, role, position, department, team, contract type)

#### Member Detail Page (`/organisation/members/[id]`)
Shows full profile: name, email, phone, department, team, contract type, status, and last 5 assigned tasks.

**Admin actions** (c-suite and above only):
- **Change role**: dropdown to change the member's role
- **Suspend**: sets their status to `suspended` (they can no longer log in to this business)
- **Reactivate**: sets status back to `active`
- **Remove**: permanently removes the member from the business (sets status to `removed`), then redirects back to the members list

---

## 11. Approvals

Only visible in the sidebar when there are pending approvals. Only `employer` role can decide.

Approval requests are created when a partnership business (with `partnership_requires_approval = true`) tries to make structural changes like adding a department. The request shows who submitted it, when, what the change is, and a formatted summary of the details.

Two buttons: **Approve** (executes the change) or **Reject** (discards it). After deciding, the page revalidates and the request disappears.

Currently supported approval types:
- `add_department` — creates the department on approval
- `remove_team` — deletes the team on approval
- `modify_member_role` — changes the role on approval

---

## 12. Settings

Three sub-pages, all accessible from `/settings`.

### Profile (`/settings/profile`)
Edit personal information: first name, last name, preferred name, date of birth, gender, pronouns, personal phone. Saves immediately on submit.

### Business (`/settings/business`)
Edit business details: name, industry, services, estimated employee count, estimated team count. The business type field is read-only (can't change from corporation to partnership after creation). Only `employer` can edit — all fields are disabled for everyone else.

### Multi-Function Button (`/settings/multi-function-button`)
Customise which actions appear when you click the floating "+" button. Pick up to 6 from:
- Create / approve task
- Talk to AI assistant *(coming soon)*
- Generate report *(coming soon)*
- Create calendar event
- Invite a member
- Review approvals

The selection is saved per user per business, so different users can have different button configurations.

---

## 13. Notifications

The bell icon in the top bar shows a red badge with the unread count.

### What triggers a notification:
1. **Task assigned to you** — when a manager creates a task and assigns it to you, or manually assigns an existing task to you
2. **Task accepted** — when an employee accepts a task you created, you get notified
3. **Task declined** — when an employee declines, you get notified

### What the panel shows:
- Each notification has an icon (bell for assignment, green tick for accepted, red X for declined), a title, optional body text, and a timestamp.
- Unread notifications have a light blue background.

### Actions in the panel:
- **Accept / Decline buttons** — appear on `task_assignment` notifications. Clicking Accept sets the task to `pending` (ready to start) and notifies the assigner. Clicking Decline removes the assignee and puts the task back to unassigned `pending`.
- **Mark as read (✓ button)** — on non-assignment notifications, marks as read and removes from the list.
- **Dismiss (× button)** — removes the notification from the panel locally (does not delete from database).
- **"All read" button** — marks everything as read and clears the panel.

### Real-time:
New notifications appear instantly without page refresh. If you have the app open in multiple tabs, marking a notification as read in one tab updates the count in all tabs (via Supabase Realtime UPDATE subscription).

---

## 14. Activity Status and Live Presence

### Setting your status
The status picker is in the right sidebar under "My status". Click it to open a dropdown. Options:

| Status | Colour | Meaning |
|---|---|---|
| Available | Green | Ready for work |
| Tasking | Yellow | Currently working on a task |
| In a meeting | Orange | In a meeting |
| Lunch break | Blue | On break |
| Personal time | Purple | Personal |
| Training | Grey | In training |
| Offline | Dark grey | Not available |

### Automatic status switching
- When you click **Start** on a task (status → `in_progress`), your activity status automatically switches to `Tasking`.
- When you click **Done** on a task (status → `completed`), your activity status automatically switches back to `Available`.

### Who sees your status
Every logged-in member of the same business can see your status in real time via the "Team now" section of the right sidebar and the "Live activity" card on the dashboard. Updates are instant — no page refresh needed.

---

## 15. Multi-Function Button

The floating "+" button in the top-right corner of the screen. Clicking it fans out a list of quick actions. Clicking "+" again (or clicking outside) closes it.

Actions that are "coming soon" (AI assistant, Generate report) show a toast message when clicked instead of navigating anywhere.

Actions that are live:
- **Create / approve task** → goes to `/tasks?new=1`
- **New calendar event** → goes to `/calendar`
- **Invite member** → goes to `/organisation/members`
- **Review approvals** → goes to `/approvals`

Each user can customise which actions appear via Settings → Multi-function button.

---

## 16. Inviting New Members

### From the Members page
C-suite and above can fill in the invite form with: email, role, position, department, team, and contract type. Clicking "Send invitation" does two things:

1. Saves the invitation to the `invitations` table with a unique token
2. Attempts to send an email via Supabase Auth's `inviteUserByEmail()` — this sends a magic link to the email address. **If SMTP is not configured in Supabase, the email fails silently.** The copy-link fallback handles this.

### Copy-link fallback
Below the active members list, any pending invitations are shown with a "Copy link" button. The link looks like: `https://yourdomain.com/invite/[token]`. You can send this directly to the person via any channel.

### Accepting an invitation (two paths)

**Path A — Clicked the email link:**
The magic link routes through `/auth/callback` which exchanges the code for a session. The user is now authenticated. They land on `/invite/[token]` already signed in. They just set their name and password, then their profile and membership are created.

**Path B — Pasted the link directly (not via email):**
The user is not signed in. They arrive at `/invite/[token]`, fill in first name, last name, and a password. The system creates their auth account, profile, and membership, then signs them in immediately.

In both cases, the invitation is marked as accepted and the user lands on `/dashboard` for the new business.

---

## 17. Multi-Business Support

A single user account can belong to multiple businesses. This happens when:
- An employer creates multiple businesses (each wizard run creates a new one)
- An employee is invited to join a second business

### Business switcher
The left sidebar shows the current business name below the logo. Clicking the switcher shows all businesses the user belongs to. Selecting one calls `/api/business/switch` which sets the `chrona-active-business` cookie to the new business ID and redirects to `/dashboard`.

All data in the app — tasks, members, calendar events, notifications — is scoped to the currently active business. Switching businesses changes everything you see.

---

## 18. Database Tables

All tables live in your Supabase PostgreSQL database. Here is what each one stores:

| Table | What it contains |
|---|---|
| `businesses` | Company record (name, type, industry, partnership settings) |
| `profiles` | One row per auth user. Personal info: name, phone, DOB, etc. Created automatically on first login via a database trigger. |
| `business_members` | Links a user to a business. Stores their role, position, department, team, contract type, and status (active / suspended / removed). |
| `departments` | Departments inside a business |
| `teams` | Teams inside a business, optionally linked to a department |
| `tasks` | All tasks. Fields: title, description, priority, status, assigned_to, created_by, due_date, start_at, requires_approval, approved_by, completed_at |
| `calendar_events` | Personal events. Fields: title, event_type, start_at, end_at, owner_id |
| `activity_status` | One row per business member. Stores their current status. Upserted (replaced) on every status change. |
| `activity_log` | Append-only history of status changes. A trigger closes the previous span when a new one starts. |
| `notifications` | Bell notifications. Fields: user_id, type, title, body, task_id, read_at |
| `invitations` | Pending invites. Token, email, role, accepted_at |
| `approval_requests` | Partnership structural change requests. action_type, payload (JSON), status, decided_by |
| `partners` | Partnership ownership records. user_id, share_percentage |
| `multi_function_button_config` | Per user per business, stores the list of chosen quick actions |

---

## 19. How Auth and Security Works

### Three layers of security

**Layer 1 — The proxy (`proxy.ts`)**
Runs on every HTTP request before the page renders. Reads the session from cookies, checks if the route is protected, and redirects to `/login` if the user is not authenticated. Also handles token refresh — if the access token has expired but the refresh token is valid, a new access token is issued transparently.

**Layer 2 — Server-side permission checks**
Every server action (form submit, button click that changes data) calls `can(role, action)` from `lib/auth/permissions.ts` before doing anything. If the check fails, the action throws an error. This means even if someone bypasses the UI, the server rejects the request.

**Layer 3 — Row-Level Security (RLS) in Supabase**
Every table has RLS policies. These run inside the database itself. Even if someone somehow constructs a raw SQL query or API call, the database will only return or modify rows that the authenticated user is allowed to see. This is the final and strongest layer.

### Three Supabase clients

| Client | File | When to use |
|---|---|---|
| Browser client | `lib/supabase/client.ts` | Client components (React components with "use client") |
| Server client | `lib/supabase/server.ts` | Server components, server actions, API routes — reads/sets cookies |
| Admin client | `lib/supabase/admin.ts` | Server-only. Bypasses RLS. Only use when you need to write across user boundaries (e.g. creating a notification for someone else). Never import in client components. |

### Active business scoping
The currently active business is stored in a cookie (`chrona-active-business`). On every authenticated server request, `requireActiveBusiness()` reads this cookie, verifies the user is an active member of that business, and sets a PostgreSQL session variable (`current_business_id`). The RLS policies on each table read this variable to automatically filter all queries to the current business. This means you never have to manually add `.eq("business_id", ...)` everywhere — the database handles it.

---

*Last updated: May 2026*
