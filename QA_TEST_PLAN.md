# Chrona — Complete QA Test Plan
**Version:** 1.0
**App:** https://chrona-business-live-h2y197w3k-mstark.vercel.app
**Prepared for:** QA Team
**Date:** June 2026

---

> **How to use this document**
> Work through each section top to bottom. For every test step, perform the action described, then verify the expected result. Mark each step ✅ Pass, ❌ Fail, or ⚠️ Partial. Log any bugs with: the section name, step number, what you did, what happened, and a screenshot.

---

## TABLE OF CONTENTS

1. Authentication — Sign In / Sign Up / Sign Out / Password Reset
2. Onboarding — Multi-Step Signup Wizard
3. Workspace Invitation Flow
4. Dashboard
5. Tasks — List View
6. Tasks — Kanban Board View
7. Task Detail Page
8. Projects — Project List
9. Project Detail & Kanban Board
10. Calendar — My Calendar
11. Calendar — Team Calendar
12. Chat
13. Inbox & Notifications
14. Organisation — Overview
15. Organisation — Members
16. Organisation — Departments & Teams
17. Approvals
18. Settings — Profile
19. Settings — Business / Workspace
20. Settings — Multi-Function Button
21. Time Tracking / Timesheets
22. Rewards & Leaderboard
23. Docs
24. Roles & Permissions Matrix
25. Real-Time Features
26. Error States & Edge Cases
27. Quick Smoke Test Checklist
28. Bug Report Template

---

---

# SECTION 1 — AUTHENTICATION

## 1.1 Sign In

**URL:** `/login`

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open the app URL in a fresh browser (not logged in) | Redirected to `/login`. Page shows Chrona logo, email field, password field, "Remember me" checkbox, and a Sign In button. |
| 2 | Click **Sign In** with both fields empty | Error message appears indicating required fields. Form does not submit. |
| 3 | Enter an invalid email format (e.g. `notanemail`) and click Sign In | Email validation error shown. Sign In does not proceed. |
| 4 | Enter a valid email that does not exist + any password, click Sign In | Error: "Invalid credentials" or equivalent. No crash. Page stays on login. |
| 5 | Enter correct email and **wrong** password, click Sign In | Error message shown. No navigation away from login. |
| 6 | Enter correct email and correct password, click Sign In | Spinner shows briefly → redirected to `/dashboard`. User is fully logged in. |
| 7 | Check "Remember me", sign in, close the browser, reopen the app URL | User remains logged in — no redirect to `/login`. Dashboard loads directly. |
| 8 | Leave "Remember me" unchecked, sign in, close the tab, reopen | User is prompted to sign in again. Session is not persisted. |
| 9 | Click **Forgot password?** link | Navigates to the password reset page (`/forgot-password`). |

---

## 1.2 Forgot Password / Reset Password

**URL:** `/forgot-password`

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Enter a non-existent email and submit | Generic success message shown ("Check your inbox") — does NOT reveal whether the email exists. |
| 2 | Enter a valid registered email and submit | Success message shown. Password reset email is delivered to the inbox within ~1 minute. |
| 3 | Open the reset link from the email | Lands on `/reset-password` with a token in the URL. Form shows new password + confirm password fields. |
| 4 | Submit mismatched passwords | Error shown: "Passwords do not match." Form does not submit. |
| 5 | Submit a valid new password (both fields match) | Success message. Redirected to `/login`. |
| 6 | Sign in with the new password | Login succeeds — dashboard loads. |
| 7 | Try to use the same reset link a second time | Error: link expired or already used. Cannot reset again with the same link. |

---

## 1.3 Sign Out

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | While logged in, find and click the **Sign Out** button (bottom of sidebar or in settings) | Session is cleared → immediately redirected to `/login`. |
| 2 | After signing out, press the browser Back button | Does NOT return to the dashboard. Stays on `/login` or redirects back to it. |
| 3 | After signing out, manually type `/dashboard` in the address bar and press Enter | Redirected to `/login`. Protected route is fully inaccessible without a session. |

---

## 1.4 Sign Up (New Account)

**URL:** `/signup`

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to `/signup` while not logged in | Step 1 of the signup wizard loads cleanly. |
| 2 | Submit the first step with empty fields | Validation errors shown on all required fields. |
| 3 | Enter an email that is already registered | Error: "Email already registered" or similar. |
| 4 | Fill in valid email + strong password + confirm password → click Next | Advances to the next step of the wizard. |
| 5 | Complete all wizard steps (see Section 2) and submit | Account created → redirected to `/dashboard`. New workspace loaded with welcome state. |
| 6 | Navigate back to `/signup` after completing registration | Redirected to `/dashboard` (already authenticated — signup not re-enterable). |

---

---

# SECTION 2 — ONBOARDING WIZARD

**URL flow:** `/signup` → `/signup/account` → `/signup/business` → `/signup/calendar` → `/signup/employees` → `/signup/complete`

| # | Step | Action | Expected Result |
|---|------|--------|----------------|
| 1 | Account Info | Enter first name, last name, date of birth, gender | All fields accept input. Required fields validated on Next click. |
| 2 | Business Info | Enter business/workspace name, select an industry sector | Workspace name is required. Industry dropdown works. Can advance. |
| 3 | Calendar Preferences | Select preferred working hours or default calendar settings | Selection saves. Can advance to next step. |
| 4 | Team Size | Select team size estimate (e.g. 1–10, 11–50, etc.) | Selection saves. Can advance. |
| 5 | Complete | Final confirmation screen shown | "Your workspace is ready" message. Click-through button navigates to `/dashboard`. |
| 6 | Back navigation | Press the Back button on any step | Returns to the previous wizard step without losing data already entered. |
| 7 | Refresh mid-wizard | Refresh the browser on Step 3 | Progress preserved OR returns to Step 1 gracefully — no crash or blank page. |

---

---

# SECTION 3 — WORKSPACE INVITATION FLOW

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | As Owner/Admin, go to **Organisation → Members** → fill the Invite form (email, role, optional position/department/team/contract) → click Invite | Success toast shown. Pending invitation appears in the Pending Invitations section with correct email and role. |
| 2 | Verify the pending invite entry | Email, role, Copy Link button, and Cancel button are all visible. |
| 3 | Click **Copy Invite Link** | Link copied to clipboard. Toast confirms "Link copied". |
| 4 | Paste the copied link in a new incognito/private browser window | Lands on `/invite/[token]` — shows workspace name, invited role, and an accept/join button. |
| 5 | Accept the invite as a new user (create account) | Account created. User joins the workspace. Redirected to `/dashboard`. New member appears in the Members list. |
| 6 | Accept the invite as an existing user (already has an account) | User signs in → joined workspace → redirected to `/dashboard`. |
| 7 | Try using the same invite link a second time (already accepted) | Error shown: "Invite already used" or "Invalid token". Does not allow joining twice. |
| 8 | Click **Cancel** on a pending invite | Invite removed from the Pending Invitations list. The old invite link no longer works (shows error when visited). |
| 9 | Invite with role = **Guest** | Accepted user has Guest permissions. Confirm in Section 24 Permissions Matrix. |
| 10 | Invite with contract type = **3-month** | Contract type stored and visible on member profile/card. |

---

---

# SECTION 4 — DASHBOARD

**URL:** `/dashboard`

## 4.1 General Load & Greeting

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to `/dashboard` after login | Page loads without errors. No blank sections. No console errors. |
| 2 | Note the time and check the greeting text | Before 12:00 → "Good morning". 12:00–17:00 → "Good afternoon". After 17:00 → "Good evening". |
| 3 | Observe the stats bar | Shows three stats: Tasks Assigned (your count), Members Online (live count), Pending Approvals (count). All numbers are numeric. |

## 4.2 Progress Ring

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Log in as **Owner or Admin** — observe the progress ring | Shows Company-wide task completion %. Ring animates on load. % and task count are shown inside. |
| 2 | Log in as **Manager** | Ring shows Team completion %. |
| 3 | Log in as **Member** | Ring shows My personal completion %. |
| 4 | Complete a task (see Section 5), return to dashboard | The % number and ring fill increase to reflect the newly completed task. |

## 4.3 Priority Tasks Grid

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Observe the Priority Tasks section | Up to 6 tasks shown in a grid. Cards are colour-coded: Red border/glow = Urgent, Orange = High. |
| 2 | Click a priority task card | Navigates to `/tasks/[id]` — task detail page loads. |
| 3 | Task with no due date | Shows "No deadline" text in muted/grey style. |
| 4 | Overdue task | Due date text shown in red. Animated pulse indicator visible. |

## 4.4 Team Insights (Owner / Admin / Manager only)

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | As Owner/Admin/Manager, look for "Most Efficient" and "Most Loaded" cards | Both cards visible on the dashboard. |
| 2 | As Member | These insight cards are NOT visible. |
| 3 | Values in the cards | Based on last 7 days. Show employee name and relevant metric. |

## 4.5 Quick Action Chips

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Click the **Create Task** quick chip | Opens the Create Task modal or navigates to task creation. |
| 2 | Click the **Calendar** quick chip | Navigates to `/calendar`. |
| 3 | Click the **Team Hub** quick chip | Navigates to `/organisation/members`. |

## 4.6 Today's Summary

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Check the Today's Summary section | Shows two counts: Tasks Completed Today, Tasks Remaining Today. |
| 2 | Complete a task | Completed count increments. Remaining decrements. |

---

---

# SECTION 5 — TASKS — LIST VIEW

**URL:** `/tasks?view=list`

## 5.1 View Modes & Tabs

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to `/tasks` | Defaults to list view. "List" toggle button appears active/selected. |
| 2 | Click **Board** toggle | Switches to kanban view (Section 6). URL updates to include `?view=kanban`. |
| 3 | Click back to **List** | Returns to list view. |
| 4 | As Owner/Admin/Manager — click **My Work** toggle | Filters to show only tasks assigned to you. Label updates to confirm mode. |
| 5 | Click **Workspace** toggle | Returns to showing all workspace tasks. |
| 6 | Click **Active** tab | Shows non-completed, non-cancelled tasks. Count badge matches the number shown. |
| 7 | Click **Created** tab | Shows tasks created by the currently logged-in user. |
| 8 | Click **Unassigned** tab | Shows pending tasks with no assignee. |
| 9 | Click **Completed** tab | Shows tasks in completed status. |

## 5.2 Task Cards in List View

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Observe task cards | Each shows: Task ID (TK-XXXX), Title, Priority badge (Urgent/High/Normal/Low), Status, Due date, Assignee avatar. |
| 2 | Urgent priority task | Red animated glow/border visible on the card. |
| 3 | High priority task | Orange glow/border visible. |
| 4 | Overdue task | Due date shown in red with a pulsing indicator. |
| 5 | Task updated within last 24 hours | "Updated" badge shown on the card. |
| 6 | Click a task card | Navigates to `/tasks/[id]`. |

## 5.3 Create Task

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Click **+ Create task** button | Modal/form opens with fields: Title, Description, Status, Priority, Due Date, Assignee. |
| 2 | Submit with no title | Validation error — title is required. Form does not submit. |
| 3 | Fill in all fields and submit | Task created. Appears in the task list immediately without a page reload. Success toast shown. |
| 4 | Create task as **Member** role | Assignee restricted to self (cannot assign to others). |
| 5 | As Member with no `task.create` permission | **+ Create task** button is NOT visible anywhere on the page. |

## 5.4 Start Work / Mark Done Quick Actions

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Find a **Pending** task assigned to you → click **Start Work** | Status changes to "In Progress". Button changes to "Mark Done". Card updates immediately. |
| 2 | Click **Mark Done** on an In Progress task | Status changes to "Awaiting Approval" (if approval flow is active) or directly to "Completed". |
| 3 | Status badge on card | Updates to the new status with correct label and colour. |

## 5.5 Awaiting Approval Section (Managers / Owners only)

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Have a Member mark a task as done (triggers approval request) | As Manager/Owner, "Awaiting Approval" section appears with the task listed. |
| 2 | Click **Approve** | Task moves to Completed. The Member receives an approval notification. |
| 3 | Click **Deny** | Task moves back. The Member receives a denial notification. |
| 4 | As Member role | Awaiting Approval section is not visible. |

## 5.6 AI Recommendations & Smart Assign

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | As Manager/Owner, look for AI Recommendations card | Card visible showing a suggested task-to-member assignment based on current workload. |
| 2 | Accept a recommendation | Task is assigned to the suggested member. Appears in their queue. |
| 3 | Available Windows card | Shows upcoming free time slots across team members for the next 7 days. |
| 4 | Manual Assignment card | Dropdown lets you pick a member to assign an unassigned task to. |

---

---

# SECTION 6 — TASKS — KANBAN BOARD VIEW

**URL:** `/tasks?view=kanban`

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Click **Board** toggle from the tasks page | Kanban board loads with 4 columns: **Backlog**, **In Progress**, **In Review**, **Done**. |
| 2 | Observe column headers | Each shows: coloured dot, label, and task count badge. |
| 3 | Observe task cards | Each card shows: Task ID, Title, Priority badge, Due date, Assignee avatar. |
| 4 | **Drag a card to a different column** | Card follows the mouse cursor exactly — no gap, no offset, no snapping. Card moves smoothly into the new column on drop. |
| 5 | After dropping cross-column | Card appears in the target column. Refresh the page — card is still in the new column (server saved). |
| 6 | **Drag a card within the same column to reorder** | Card reorders within the column smoothly. New position persists after page refresh. |
| 7 | Drag rapidly between multiple columns | No crash. No page freeze. App remains fully stable. |
| 8 | Switch to Board view and immediately try to drag | Card follows cursor exactly — no offset from the page transition animation. |
| 9 | As **Member** role | Only your own assigned tasks are draggable. Other tasks are visible but cannot be dragged. |
| 10 | As **Manager / Owner** | All tasks in all columns are draggable. |
| 11 | Click a task card (without dragging) | Task detail slide-over panel opens on the right side of the screen. |
| 12 | In the slide-over, click **View full details →** | Navigates to `/tasks/[id]` full detail page. |
| 13 | Click **+ Add task** at the bottom of any column | Inline input form appears at the bottom of that column. |
| 14 | Type a task title in the inline form and click **Add** | Task created in that column's status. Appears immediately in the column without page reload. |
| 15 | Click **Cancel** on the inline form | Form dismisses. No task created. |
| 16 | Drag onto an **empty column** | Task lands cleanly in the empty column. Empty state placeholder replaced by the task card. |
| 17 | Column with many tasks | Cards are scrollable within the column. Board layout does not break. |

---

---

# SECTION 7 — TASK DETAIL PAGE

**URL:** `/tasks/[id]`

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Click any task from the list or kanban | Task detail page loads. Shows: Title, Description, Status badge, Priority badge, Due Date, Assignee, Created date, Task ID. |
| 2 | Change **Priority** via the dropdown | Priority updates immediately. New priority badge reflected on the page. |
| 3 | Change **Assignee** via the dropdown | Task reassigned. Original and new assignees receive notifications. |
| 4 | Click **AI Draft Description** | AI-generated description populates the description field. Content is relevant to the task title. |
| 5 | Click **AI Suggest Due Date** | AI suggests a due date. Date populates the due date field. |
| 6 | Schedule as calendar event — fill in time details and submit | Event created in the calendar. Navigating to `/calendar` shows the new event on the correct date. |
| 7 | Click the **Back** button | Returns to the previous page (`/tasks`) without losing list state. |
| 8 | Add a comment — type in the comment box and submit | Comment appears in the discussion thread below the task. |
| 9 | Click **AI Summarize Comments** (if comments exist) | A concise summary of the comment thread is shown. |
| 10 | View a task assigned to someone else (as Member) | Priority change and reassign controls are restricted or hidden. |
| 11 | Status badge | Correctly coloured by status: Grey = Pending, Blue = In Progress, Amber = In Review, Green = Done. |

---

---

# SECTION 8 — PROJECTS — LIST

**URL:** `/projects`

## 8.1 Viewing Projects

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to `/projects` | Page loads. Stats bar at top shows: Total Projects count, Completed Projects (count + %), Tasks In Progress count. |
| 2 | Click **All** tab | All projects shown regardless of status. |
| 3 | Click **Active** tab | Only active projects shown. Tab badge count matches. |
| 4 | Click **Completed** tab | Only completed projects shown. |
| 5 | Click **Archived** tab | Only archived projects shown. |
| 6 | Observe each project card | Shows: Project name, template icon, description (2-line max), progress bar, completion %, member avatars (up to 4), task count, status badge, deadline (if set). |
| 7 | Progress bar | Fills proportionally to completed tasks / total tasks. |
| 8 | Click **Open** on a project card | Navigates to `/projects/[id]`. |
| 9 | No projects exist | Empty state shown with a "Create your first project" prompt. |

## 8.2 Create Project

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Click **+ New Project** or **Create Project** button | Project creation form/modal opens. |
| 2 | Submit with empty name | Validation error — project name is required. |
| 3 | Select a **Template** | Four options: Blank, Software, Agency, Operations — each with an icon. Selected template is visually highlighted. |
| 4 | Fill in name, description, template, deadline, and select members | All inputs accept data. Member checkboxes show visual feedback (scale + colour change) when selected. |
| 5 | Click **Create** | Project created. Appears in the projects list. Success toast shown. |
| 6 | Click **Cancel** | Form dismissed. No project created. Returns to projects list. |
| 7 | As **Member** role (no `project.create` permission) | "New Project" button is NOT visible. |

---

---

# SECTION 9 — PROJECT DETAIL & KANBAN BOARD

**URL:** `/projects/[id]`

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open a project | Project name, description, status, deadline, and member avatars visible in the header. |
| 2 | View the Kanban board | Columns: Backlog, In Progress, In Review, Done. Project-specific tasks shown in correct columns. |
| 3 | Drag a task between columns | Smooth, follows cursor exactly, persists after page refresh. (Same behaviour as Section 6.) |
| 4 | Click **+ Add task** in a column | Inline form appears. Created task belongs to this project. |
| 5 | Click **Edit Project** | Edit form opens with name, description, status, and deadline pre-filled. |
| 6 | Change project name and save | Name updates in the header, in the projects list, and anywhere else it appears. |
| 7 | Change status to **Completed** | Status badge updates. Project moves to the Completed tab in the projects list. |
| 8 | Change status to **Archived** | Project moves to the Archived tab. |
| 9 | Add a new member to the project | Member selector shown. Selected member added to the project. Avatar appears in the member row. |
| 10 | Remove a member from the project | Confirmation step (if any) → member removed. Avatar no longer shown. |
| 11 | Overflow member avatars | If more than 4 members, shows "+N" overflow badge. |

---

---

# SECTION 10 — CALENDAR — MY CALENDAR

**URL:** `/calendar`

## 10.1 Viewing the Calendar

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to `/calendar` | Month view loads. Current month displayed. Today's date highlighted distinctly. |
| 2 | Click the **Week** view option | Switches to week view (`/calendar/week`). Days shown horizontally with time slots. |
| 3 | Navigate to previous/next month or week | Calendar shifts correctly. Navigation arrows work. |
| 4 | Observe events | Events shown as coloured blocks on their scheduled dates/times. |
| 5 | Event colour coding | Meeting, Focus, Block, Other — each type has a distinct colour. |
| 6 | Task due dates | Due dates of tasks appear as markers or lightweight events on their dates. |

## 10.2 Create Event

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Click on a date in the calendar | Quick Schedule sidebar form activates OR a new event creation form opens. |
| 2 | Fill in: Title, Event Type, Date, Start Time, End Time | All fields accept input. End time defaults to +1 hour from start time. |
| 3 | Toggle **Team Event** ON | This event will also appear in the Team Calendar. |
| 4 | Submit with no title | Validation error — title is required. Form does not submit. |
| 5 | Submit a valid event | Event created. Appears on the calendar on the correct date. Success message shown. |
| 6 | Click on an existing event | Event detail shown: title, type, time, description. Edit and Delete options visible. |
| 7 | Edit an existing event | Change title or time → save → event updates on the calendar immediately. |
| 8 | Delete an event | Confirmation prompt → confirmed → event removed from calendar. |

## 10.3 Upcoming Reminders Widget

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Check the sidebar or widget area | Upcoming events listed in chronological order with title and time. |
| 2 | No upcoming events | Empty state shown: "No upcoming events." |

---

---

# SECTION 11 — CALENDAR — TEAM CALENDAR

**URL:** `/calendar?team=1`

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Click **Team Calendar** toggle | View switches to team mode. URL updates with `team=1`. |
| 2 | Observe events | Team events from all members (marked `is_team = true`) are visible alongside your own personal events. |
| 3 | **Team Today** panel | Sidebar panel shows each team member's event count for today. |
| 4 | Create a Team event (toggle Team Event ON) | New event visible to all team members on their Team Calendar view. |
| 5 | Switch back to **My Calendar** toggle | Only personal events shown. Other team members' events disappear. |
| 6 | Real-time: have another team member create a team event while you watch | Your Team Calendar updates without a page refresh. |

---

---

# SECTION 12 — CHAT

**URL:** `/chat`

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to `/chat` | Chat interface loads. Member list visible with count. Last 50 messages shown. |
| 2 | Observe existing messages | Each message shows: Author name (preferred name if set), timestamp, and message content. |
| 3 | Type a message in the input field | Characters appear in the input. |
| 4 | Press **Enter** to send | Message sent. Appears at the bottom of the chat immediately. Input clears. |
| 5 | Click the **Send** button | Same as pressing Enter — message sent and appears. |
| 6 | Submit an empty message | Nothing happens — no blank messages are sent. |
| 7 | **Real-time test** (two windows, two users) | Message sent in Window A appears instantly in Window B without any page refresh. |
| 8 | Long message (100+ characters) | Text wraps correctly within the message bubble. No horizontal overflow or layout breakage. |
| 9 | Scroll up in chat | Older messages visible. Recent messages still accessible by scrolling down. |
| 10 | Check member list | Shows all workspace members. Online members have a green presence indicator. |

---

---

# SECTION 13 — INBOX & NOTIFICATIONS

**URL:** `/inbox`

## 13.1 Notification Display

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to `/inbox` | Notifications list loads. Summary sidebar shows: Total, Unread, Assigned to Me, Approvals counts. |
| 2 | Unread notifications | Shown with an animated pulsing dot. |
| 3 | Each notification entry shows | Type label (e.g. TASK ASSIGNMENT), time ago, title, body preview, priority badge (if task-related), project name, sender name. |
| 4 | Click a notification | Navigates to the related task (`/tasks/[id]`). Notification is marked as read (dot disappears). |
| 5 | Hover over a notification | "Mark as read" button appears on the right. |
| 6 | Click **Mark as read** on a single notification | Unread dot removed from that notification. Unread count in summary decreases by 1. |

## 13.2 Tabs

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Click **All** tab | All notifications shown regardless of type. |
| 2 | Click **Assigned to Me** tab | Only "Task Assignment" notifications shown. |
| 3 | Click **Approvals** tab | Only "Approval Requested" notifications shown. |
| 4 | Tab badge counts | Each tab badge accurately reflects the number of notifications of that type. |

## 13.3 Mark All as Read

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | With unread notifications present, find **Mark all as read** button | Button visible in the page header when unread count > 0. |
| 2 | Click **Mark all as read** | All pulsing dots removed. Unread count resets to 0. |
| 3 | After marking all read | Button hides or becomes disabled. |

## 13.4 Real-Time Notifications

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | As User A, assign a task to User B | User B's notification bell icon in the sidebar updates its badge count immediately. New notification visible in inbox without refresh. |
| 2 | Member submits task for approval | Manager/Owner receives Approval Requested notification in real time. |

---

---

# SECTION 14 — ORGANISATION OVERVIEW

**URL:** `/organisation`

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to `/organisation` | Overview page loads with 3 stat cards: Departments, Teams, Members — each with a count and a navigation link. |
| 2 | Click **Departments** card | Navigates to `/organisation/departments`. |
| 3 | Click **Teams** card | Navigates to `/organisation/teams`. |
| 4 | Click **Members** card | Navigates to `/organisation/members`. |
| 5 | Counts on cards | Match the actual number of departments, teams, and members in the workspace. |

---

---

# SECTION 15 — ORGANISATION — MEMBERS

**URL:** `/organisation/members`

## 15.1 Member List

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to `/organisation/members` | Active members list shown with a count badge. |
| 2 | Each member card shows | Avatar, Full name, Role badge (owner/admin/manager/member/guest), Position/Title, Department, Team, Presence status, Email. |
| 3 | Online member | Green dot or "Online" indicator visible. |
| 4 | Offline member | Grey dot or "Offline" shown. |
| 5 | Click a member card | Navigates to member detail page or expands member info. |

## 15.2 Invite New Teammate

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Locate the Invite form in the right sidebar | Form visible with: Email (required), Role dropdown, Position input, Department dropdown, Team dropdown, Contract Type dropdown. |
| 2 | Submit with no email | Validation error — email is required. |
| 3 | Submit with invalid email format | Validation error shown. |
| 4 | Fill all fields and submit | Invite sent. Pending invitation appears below active members. Success toast shown. |
| 5 | Role dropdown options | Member, Manager, Admin, Guest — all selectable. |
| 6 | Contract Type options | Full-time, 3-month, 6-month, 12-month, Custom — all selectable. |

## 15.3 Pending Invitations

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Invited, not-yet-accepted users | Appear in a Pending Invitations section with their email and assigned role. |
| 2 | Click **Copy invite link** | Link copied to clipboard. Toast confirms "Link copied". |
| 3 | Click **Cancel** on a pending invite | Invite removed from the pending list. Old invite link no longer works. |

---

---

# SECTION 16 — ORGANISATION — DEPARTMENTS & TEAMS

**URL:** `/organisation/departments` and `/organisation/teams`

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | View **Departments** page | List of all departments shown with names and member counts. |
| 2 | Create a new department (if button available) | Form opens. Enter name → submit → department appears in the list (may trigger an approval request — see Section 17). |
| 3 | Assign a member to a department | Member's department field updated. Shows correctly on their member card. |
| 4 | View **Teams** page | List of teams shown with names and member counts. |
| 5 | Create a new team | Form opens. Enter name → submit → team created and visible in the list. |
| 6 | Delete a team | May trigger an approval request rather than deleting immediately. |
| 7 | Assign a member to a team | Member's team field updated and visible on their card. |

---

---

# SECTION 17 — APPROVALS

**URL:** `/approvals`

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to `/approvals` as Owner/Admin | Pending approval requests listed. |
| 2 | Approval request types shown | add_department, remove_team, modify_member_role — each with an action label, requester name, date, and payload details. |
| 3 | Click **Approve** on a request | Action executed (e.g. department created). Request removed from the list. Requester notified. |
| 4 | Click **Reject** on a request | Action not executed. Request removed. Requester notified of rejection. |
| 5 | No pending approvals | Empty state shown: "No pending approvals." |
| 6 | As Member or Manager | Page inaccessible or shows no approve/reject controls. |

---

---

# SECTION 18 — SETTINGS — PROFILE

**URL:** `/settings/profile`

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to `/settings` | Settings overview shows navigation cards for Profile, Workspace, Quick Actions, Rewards, Help, Invite. |
| 2 | Click **Profile** card | Navigates to `/settings/profile`. Form shows: Avatar area, First name, Last name, Preferred name, Date of birth, Gender, Pronouns, Phone. |
| 3 | Click the avatar area / drag a photo onto it | Image preview updates immediately. After save, photo appears in the sidebar and member card. |
| 4 | Change First Name and click away (blur the field) | Auto-save triggers. A "Saved" indicator appears briefly. |
| 5 | Set a **Preferred Name** | Name used in chat messages and notification sender labels. |
| 6 | Fill all fields and save | All data persists after a full page refresh. |
| 7 | Navigate away and return to profile | All previously saved values still populated correctly. |

---

---

# SECTION 19 — SETTINGS — BUSINESS / WORKSPACE

**URL:** `/settings/business`

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to `/settings/business` (Owner/Admin only) | Form shows: Logo upload, Workspace Name, Industry Sector, Business Model (read-only), Core Services, Estimated Employees, Estimated Teams. |
| 2 | Upload a workspace logo | Preview updates. After save, logo appears in the app header and branding. |
| 3 | Change Workspace Name and save | Name updates everywhere it appears (dashboard header, sidebar, member cards). |
| 4 | Change Industry Sector and save | Value persists after page refresh. |
| 5 | Attempt to access as **Member** role | Page is inaccessible (redirected or access denied). |

---

---

# SECTION 20 — SETTINGS — MULTI-FUNCTION BUTTON

**URL:** `/settings/multi-function-button`

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to the Multi-Function Button settings | Page loads showing customisable action slots for the **+** floating button visible throughout the app. |
| 2 | Assign an action to a slot (e.g. "Create Task") | Selection saved. Confirmation shown. |
| 3 | Navigate to any main app page and click the **+** button | The configured actions appear as a menu. |
| 4 | Click one of the + button actions | Correct action triggered (e.g. Create Task form opens, Calendar event form opens, etc.). |
| 5 | Change the + button action and test again | New action triggered. Old action no longer appears. |

---

---

# SECTION 21 — TIME TRACKING / TIMESHEETS

**URL:** `/timesheets`

## 21.1 Personal Timesheet

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to `/timesheets` | Personal activity log shown in a table with columns: Status, Started At, Ended At, Task Title, Duration. |
| 2 | Observe activity entry statuses | Correctly labelled: worked, break, idle, offline. |
| 3 | Duration column | Correctly calculated as Ended At minus Started At. |
| 4 | Entry linked to a task | Task title shown in the Task column. |
| 5 | Entry not linked to a task | Task column shows "—" or is blank. |

## 21.2 Manager View

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | As Manager/Owner, look for a member selector | Dropdown with all team members visible above the table. |
| 2 | Select a different team member | Timesheet switches to show that member's activity log. |
| 3 | Weekly summaries panel | Each team member's total hours for the current week shown. |
| 4 | As **Member** | No member dropdown — only own timesheet visible. |

---

---

# SECTION 22 — REWARDS & LEADERBOARD

**URL:** `/rewards`

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to `/rewards` | Page loads. Your stats card shows: Total Points, Tasks Completed, Day Streak (flame icon), Current Rank (#X of N). |
| 2 | Podium section | Top 3 members shown: 2nd place left, 1st place centre (larger card, gold accent), 3rd place right. Medal emojis (🥇🥈🥉) visible. |
| 3 | Each podium slot shows | Member name, role, total points, task count, streak days. |
| 4 | Full rankings table (4th place and below) | Table with columns: Rank #, Avatar, Name, Tasks, Streak, Points. |
| 5 | Your own entry | Highlighted with a different background or bold text. |
| 6 | Scoring rules card | Shows all rules: +10 pts (complete task), +5 pts (on-time delivery), +3 pts (first task of day), +25 pts (7-day streak). |
| 7 | Motivational quote | Displayed on the page. Check a different day — quote should have changed. |
| 8 | Complete a task, return to Rewards | Your points total and rank update to reflect the completion. |
| 9 | Click **Back to Dashboard** | Returns to `/dashboard`. |

---

---

# SECTION 23 — DOCS

**URL:** `/docs`

## 23.1 Layout

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to `/docs` | Three-panel layout loads: Left sidebar (doc list), Centre pane (home or editor). No doc selected → Home pane visible. |

## 23.2 Sticky Notes (Home Pane)

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Observe the sticky notes board | Coloured notes visible with slight rotation, a pin graphic, and a date stamp. |
| 2 | Click **+ Add sticky** | New sticky note created and added to the board. |
| 3 | Click on a sticky note | Note becomes editable. Type content. Click away to save. |
| 4 | Hover over a sticky note | Delete (trash) icon appears. |
| 5 | Click the delete icon | Note removed from the board. |
| 6 | Refresh the page | All sticky notes still present (stored in browser localStorage). |

## 23.3 Creating & Editing Docs

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Click **+ New Doc** | New doc added to the sidebar list. Editor pane opens with empty title and content fields. |
| 2 | Type a title | Title auto-saves. Updates in the sidebar list as you type. |
| 3 | Type body content | Content accepted. No character limit errors. |
| 4 | Click **H1** in the formatting toolbar | Inserts `# ` at the start of the current line. |
| 5 | Click **Bold** | Wraps selected text in `**...**`. |
| 6 | Click **Italic** | Wraps selected text in `*...*`. |
| 7 | Click **Code** | Wraps selected text in backticks. |
| 8 | Use keyboard shortcut **Ctrl+B** | Applies bold formatting. |
| 9 | Use **Ctrl+I** | Applies italic formatting. |
| 10 | Use **Ctrl+S** | Manually triggers a save. "Saved" indicator shown. |
| 11 | Click **Preview** toggle | Editor switches to rendered markdown preview. Headings, bold, italic, code, and lists render correctly. |
| 12 | Click **Edit** toggle | Returns to raw text editor. Content unchanged. |
| 13 | Footer stats | Shows: Created date, Last updated date, Word count, Estimated read time, Character count. |
| 14 | Auto-save | "Saved" text appears automatically after ~1.2 seconds of inactivity. |
| 15 | Close doc and reopen | All title and content fully preserved. |

## 23.4 Deleting Docs

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Hover over a doc in the sidebar | Trash icon appears. |
| 2 | Click the trash icon | Doc deleted from sidebar. Editor closes or returns to home pane. |
| 3 | After deletion | Doc no longer appears in "Recent Docs" grid on the home pane. |

## 23.5 Recent Docs (Home Pane)

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Create several docs, return to home pane | Recent docs grid shows the most recently modified docs with: Title, Content preview (first ~60 characters), Last updated date. |
| 2 | Click a recent doc card | Opens that doc directly in the editor. |
| 3 | Dashed "New Doc" card in the grid | Clicking it opens a new blank doc — same as the + New Doc button. |

---

---

# SECTION 24 — ROLES & PERMISSIONS MATRIX

> Log in as a user with each role and verify each capability is correctly enforced.

| Feature / Action | Owner | Admin | Manager | Member | Guest |
|-----------------|-------|-------|---------|--------|-------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| See Team Insights on Dashboard | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Task | ✅ | ✅ | ✅ | ✅ | ❌ |
| Assign Task to Others | ✅ | ✅ | ✅ | ❌ | ❌ |
| Change Task Priority | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve / Deny Tasks | ✅ | ✅ | ✅ | ❌ | ❌ |
| View All Workspace Tasks | ✅ | ✅ | ✅ | Own only | ❌ |
| Drag Any Kanban Card | ✅ | ✅ | ✅ | Own only | ❌ |
| Create Project | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit / Archive Project | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete Project | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite Members | ✅ | ✅ | ✅ | ❌ | ❌ |
| View All Members | ✅ | ✅ | ✅ | ✅ | ✅ |
| Change Member Roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| Access Business Settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Access Approvals Page | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Others' Timesheets | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create / Edit Calendar Events | ✅ | ✅ | ✅ | ✅ | ❌ |

---

---

# SECTION 25 — REAL-TIME FEATURES

> These tests require **two browser sessions** logged in as different users in the same workspace at the same time.

| # | Feature | Action (User A does this) | Expected Result (User B sees this — no page refresh) |
|---|---------|--------------------------|------------------------------------------------------|
| 1 | Chat | Send a message | Message appears in User B's chat within 1–2 seconds |
| 2 | Task Assignment | Assign a task to User B | User B's notification bell count increments. New notification in their inbox. |
| 3 | Team Calendar | Create a team event | Event appears on User B's Team Calendar view. |
| 4 | Member Presence | User A is actively using the app | User B sees User A as "Online" in the member list. |
| 5 | Presence (offline) | User A closes the browser | User B sees User A's status change to Offline within ~30 seconds. |
| 6 | Task Approval | Member marks a task done (triggers approval) | Manager/Owner receives Approval notification instantly. |
| 7 | Timesheet Status | User A's activity status changes (idle → active) | User B (Manager) sees updated status in the timesheets page. |

---

---

# SECTION 26 — ERROR STATES & EDGE CASES

| # | Scenario | How to Test | Expected Result |
|---|----------|-------------|----------------|
| 1 | Suspended account | Log in with a suspended account | Red banner: "Account suspended." Option to sign out shown. Cannot access any app page. |
| 2 | Unauthenticated access | Visit `/dashboard` while not logged in | Redirected to `/login`. |
| 3 | Page Not Found | Navigate to `/xyz-does-not-exist` | 404 page shown with a message and a link back to the app. |
| 4 | Empty tasks list | Log in to a workspace with no tasks | "No tasks yet" empty state with a create prompt shown — no errors. |
| 5 | Empty projects list | Workspace with no projects | "No projects yet" empty state shown. |
| 6 | Very long task title | Create a task with 200+ characters in the title | Title truncated with ellipsis on cards. Full title readable on the detail page. |
| 7 | Very long chat message | Send a 300-character message in chat | Text wraps correctly. No UI overflow. |
| 8 | Permission denied | As Member, navigate to `/settings/business` via URL bar | Redirected away or "Access Denied" message shown. |
| 9 | Expired invite link | Visit an old/cancelled invitation link | Error: "Invalid or expired invitation." Cannot join. |
| 10 | Browser back after sign out | Sign out, then press browser Back | Does not return to authenticated area. Stays on `/login`. |
| 11 | Slow network | Use browser DevTools to throttle to "Slow 3G", then use the app | Loading spinners shown. App does not crash. Actions eventually succeed or show a timeout error. |
| 12 | Multiple browser tabs | Open the app in two tabs as the same user | Changes in one tab (e.g. completing a task) reflected in the other tab on next navigation. |
| 13 | Wrong account | Already logged in as User A, click a User B invite link | App detects the mismatch and suggests signing out first. |

---

---

# SECTION 27 — QUICK SMOKE TEST CHECKLIST

> Run this checklist before every release. It takes ~10 minutes and catches critical breakage.

- [ ] Sign in with valid credentials → Dashboard loads
- [ ] Greeting text is correct for the time of day
- [ ] Progress ring shows a % and animates
- [ ] Create a task → appears in the task list immediately
- [ ] Switch to Kanban Board → board loads with all 4 columns
- [ ] Drag a task card → card follows cursor exactly, no gap or snap
- [ ] Drag does not crash the page
- [ ] Create a project → appears in projects list
- [ ] Open a project → kanban board loads with project tasks
- [ ] Invite a member → invite appears in Pending Invitations
- [ ] Calendar loads → can create and see a new event
- [ ] Chat loads → can send a message → message appears
- [ ] Inbox → notifications listed correctly
- [ ] Rewards page → leaderboard loads with scores and podium
- [ ] Docs → create a new doc, type content, verify auto-save
- [ ] Settings / Profile → can update name and it saves
- [ ] Sign out → redirected to `/login`
- [ ] After sign out, `/dashboard` redirects to `/login`

---

---

# SECTION 29 — TASK CREATION & NOTIFICATION FLOW (FULL END-TO-END)

> Requires two browser sessions: **User A = Manager/Owner**, **User B = Member (e.g. Aiden Brookes)**. Run these in order.

## 29.1 Create & Assign Task (Manager)

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | As User A (Manager), go to `/tasks` → click **+ Create Task** | Task creation modal opens with Title, Description, Priority, Due Date, Status, Assignee fields. |
| 2 | Fill in: Title = "Test Notification Task", Priority = High, Due = tomorrow, leave Assignee empty → Submit | Task created and appears in the task list. No notification sent (no assignee). |
| 3 | Open the newly created task card → navigate to `/tasks/[id]` | Task detail page loads showing status = Pending, Assignee = Unassigned. |
| 4 | In the **Assigned To** dropdown, select **Aiden Brookes** → click **Save** | ✅ Button shows a loading spinner while saving. After saving: status changes to **Awaiting Acceptance**. Assignee now shows Aiden Brookes. |
| 5 | Check User B's (Aiden) notification bell **without page refresh** | Bell badge count increases by 1 within ~2 seconds (real-time). |
| 6 | As User B (Aiden), click the notification bell | Dropdown shows: "You've been assigned: Test Notification Task" — unread (pulsing dot). |
| 7 | As User B, go to `/inbox` | Assignment notification visible. Type label shows "TASK ASSIGNMENT". Task title, assigner name, and priority badge all correct. |
| 8 | User A's tasks list view | Task shows status = "AWAITING ACCEPTANCE" badge. No loading required. |

## 29.2 Accept Task Flow (Assignee)

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | As User B, click the notification in the bell → click the task | Navigates to `/tasks/[id]`. Accept and Decline buttons visible at the top. |
| 2 | Click **Accept** on the task detail page | ✅ Button shows loading spinner while processing. After: button disappears. Status badge changes to **Pending**. Confirmation visible. |
| 3 | Check User A's notification bell **without refresh** | Bell increments. New notification: "Task accepted: Test Notification Task". |
| 4 | As User A, open inbox | "task_accepted" notification visible. Message is clear and links to the task. |
| 5 | Check the task status in User A's task list | Status is now **Pending** (not Awaiting Acceptance). No refresh needed. |
| 6 | As User B, check the Inbox | The original "task_assignment" notification is now marked as read (no pulsing dot). |

## 29.3 Accept Task from Inbox (Alternative Path)

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | As User B (Aiden), with an unread assignment notification, go to `/inbox` | Task assignment notification shown with **Accept** and **Decline** buttons inline. |
| 2 | Click **Accept** directly from the Inbox | ✅ Loading spinner appears on the Accept button. Task updates to Pending. Notification marked as read. |
| 3 | Check that the Accept/Decline buttons are gone after accepting | Buttons no longer shown — notification is in a "completed" state. |

## 29.4 Decline Task Flow (Assignee)

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | As User A, assign a new task to User B | Task status = Awaiting Acceptance. User B receives assignment notification. |
| 2 | As User B, open the task and click **Decline** | ✅ Button shows loading spinner. After: task unassigned (assigned_to = null). Status resets to **Pending**. |
| 3 | Check User A's inbox **without refresh** | New notification: "Task declined: [task title]". Clear message that the task was declined. |
| 4 | Check the task in User A's task list | Task shows as **Pending** + **Unassigned** — ready to be reassigned. No refresh needed. |
| 5 | As User A, reassign the task to someone else | New assignment notification sent to the new assignee. Full notification flow restarts. |

## 29.5 Reassignment Flow

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Task currently assigned to Aiden (Awaiting Acceptance) | Visible on task detail page. |
| 2 | As Manager, change assignee in the dropdown to Priya Shah → Save | ✅ Save button shows loading. Aiden's assignment notification is replaced. Priya receives a new assignment notification. |
| 3 | Check Priya's notification bell **without refresh** | Priya's bell increments. She sees "You've been assigned: [task]". |
| 4 | Task list view updates **without refresh** | Task shows Priya as the new assignee within ~1-2 seconds. |
| 5 | Aiden's inbox | Aiden does NOT see a new notification (he was replaced before accepting). |

## 29.6 Real-Time Task Updates (both users watching simultaneously)

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | User A and User B both have `/tasks` open simultaneously | Both viewing the same task list. |
| 2 | User A assigns a task to User B | User B's task list updates **within ~2 seconds without refresh** — new task appears in their list. |
| 3 | User B accepts a task | User A's task list shows status change to Pending without refresh. |
| 4 | User A changes a task's priority | Both users see the updated priority badge within ~2 seconds. |
| 5 | Both users on task detail page `/tasks/[id]` | Any assignment or status change appears on BOTH screens without a manual reload. |

---

---

# SECTION 30 — CALENDAR BLOCK (from Task Detail Page)

**URL:** `/tasks/[id]` → "Block time on Calendar" section

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open any task detail page | "Block time on Calendar" section visible below the task card. Shows: Title field (pre-filled with task name), Date field (pre-filled with task due date), Start Time (defaults to 09:00), End Time (defaults to 10:00). |
| 2 | Click **Add to Calendar** with all fields filled | ✅ Button immediately shows a loading spinner and disables. Page reloads after saving. |
| 3 | After redirect | ✅ A green success banner appears at the top: "Calendar block added successfully! You can view it in My Calendar." Banner links to `/calendar`. |
| 4 | Click the "My Calendar" link in the banner | Navigates to `/calendar`. The new event appears on the correct date and time. |
| 5 | Click **Add to Calendar** without a date | Button disabled — date field is `required`. Browser validation shows error before submission. |
| 6 | Click **Add to Calendar** without a time | Browser validation blocks submission. |
| 7 | Change the title before submitting | Event saved with the custom title (not the default task title). |
| 8 | Add two calendar blocks to the same task | Both events appear on the calendar independently. No duplication errors. |

---

---

# SECTION 31 — AI CHATBOT (CHRONA NEXUS)

**Access:** Click the ✨ Sparkles icon in the top navigation bar.

## 31.1 Startup & Basic Interaction

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Click the Sparkles ✨ icon | AI drawer slides in from the right. Welcome message shown from Chrona Nexus with quick-tap chips. |
| 2 | Tap **"Daily standup"** chip | AI immediately responds with a workspace standup: what's done, in progress, and any blockers — no extra prompting needed. |
| 3 | Tap **"Who's available?"** chip | AI lists only members with status = "available". Members who are tasking, in meetings, or offline are NOT listed as available. |
| 4 | Tap **"Overdue tasks"** chip | Lists tasks whose due date is in the past. Each task shows title, priority, and who it's assigned to. |
| 5 | Tap **"Analyse workload"** chip | Shows a distribution of tasks across team members. Flags anyone with 0 tasks (underloaded) or 5+ tasks (overloaded). |
| 6 | Type: "What is Aiden doing?" | Responds with Aiden Brooks' current activity status (from live presence data). NOT fictional. |

## 31.2 Task Creation via AI

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Type: "Create a task: Update the homepage banner, due next Monday, priority high" | AI confirms task creation AND shows a green "Task Created" card with the task name. |
| 2 | Check `/tasks` list | New task appears in the workspace task list with correct title, priority, and due date. |
| 3 | Type: "Create a task: Fix login bug" (no date/priority) | AI creates the task immediately with default priority (normal) and no due date. Does NOT ask clarifying questions. |
| 4 | Check `/tasks` list | "Fix login bug" task exists with status = Pending. |
| 5 | Type: "Create 3 tasks for the sprint" | AI should create all 3 tasks and confirm each one. Check `/tasks` to verify all exist. |

## 31.3 "My Tasks" Query (correct user context)

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Log in as Aiden Brookes. Open Chrona Nexus. Type: "What are my tasks?" | AI responds with ONLY tasks assigned to Aiden Brookes — not all workspace tasks. Names match correctly. |
| 2 | Log in as Mishal Boss. Type: "What are my tasks?" | AI responds with ONLY tasks assigned to Mishal — not Aiden's or anyone else's. |
| 3 | Type: "Show me all active tasks" | AI shows ALL active workspace tasks (not filtered to current user). Each shows who it's assigned to. |
| 4 | Type: "Who has the most tasks?" | AI identifies the member with the highest task count based on live data. |
| 5 | Type: "What is Alden doing?" (slight typo for Aiden) | AI responds: "Did you mean Aiden Brooks?" and corrects it gracefully. |

## 31.4 Known Limitations (AI Must NOT Claim These Work)

> ⚠️ The AI chatbot **cannot** do the following. It must admit this honestly if asked.

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Ask: "Reassign the task called Bug Triage to Aiden Brookes" | AI responds that it cannot modify existing tasks — it can only assign new tasks upon creation. Suggests the user go to the task detail page. |
| 2 | Ask: "Mark my task as complete" | AI explains it cannot change task status — the user must do this manually via the task list or detail page. |
| 3 | Ask: "Show me my timesheets" | AI can describe where to find timesheets (/timesheets) but cannot show the actual logged hours. |
| 4 | Ask: "Delete the task called Bug Triage" | AI cannot delete tasks and must say so clearly. |
| 5 | Ask: "Send a message to Aiden" | AI cannot send chat messages. It will direct the user to `/chat`. |

## 31.5 Hallucination Tests

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Ask: "What tasks does John Smith have?" (no John Smith in workspace) | AI says "I don't see a John Smith in this workspace" — does NOT fabricate tasks. |
| 2 | Ask: "Who completed the most tasks last week?" | AI should only reference data it has (completed tasks loaded). It should NOT fabricate statistics it doesn't have. |
| 3 | Ask: "What meetings do I have today?" (with calendar events set) | AI correctly lists today's events from your calendar. If you have none, it says "No meetings scheduled today" — does NOT invent meetings. |
| 4 | Ask: "Is Aiden available?" when Aiden is marked as "tasking" | AI correctly says Aiden is BUSY (tasking) — NOT available. Does NOT hallucinate. |
| 5 | Ask the same question twice | AI gives consistent answers based on the same workspace data. No random fabrication. |

---

---

# SECTION 32 — UPDATED SMOKE TEST CHECKLIST (v2)

> Run this checklist before every release. It takes ~15 minutes.

**Authentication & Navigation**
- [ ] Sign in → Dashboard loads
- [ ] Greeting text correct for time of day
- [ ] Progress ring shows % and animates
- [ ] Sign out → redirected to `/login`
- [ ] After sign out, `/dashboard` redirects to `/login`

**Tasks — Core**
- [ ] Create a task → appears in list without page reload
- [ ] Assign task to a member → Save button shows loading spinner
- [ ] Task status changes to "Awaiting Acceptance" after assignment
- [ ] Assigned member receives notification instantly (bell count increases without refresh)
- [ ] Assignee can Accept task from Inbox → Accept button shows loading
- [ ] After Accept → task status changes to Pending in real-time on Manager's view
- [ ] Assignee can Decline task → Manager notified instantly
- [ ] After Decline → task shows as Unassigned/Pending in real-time

**Tasks — Detail Page**
- [ ] Switch to Kanban Board → board loads with all 4 columns
- [ ] Drag a task card → card follows cursor exactly, no gap or snap
- [ ] Open task detail → all fields correct (status, priority, assignee, dates)
- [ ] Change priority → Save button shows spinner → updates immediately

**Calendar Block**
- [ ] On task detail page, fill in calendar block form → click "Add to Calendar"
- [ ] Button shows loading spinner during submission
- [ ] After submission → green success banner appears: "Calendar block added successfully!"
- [ ] Navigate to `/calendar` → event appears on the correct date

**Notifications**
- [ ] Inbox loads notifications correctly
- [ ] Unread notifications have pulsing dot
- [ ] Mark single notification as read → dot disappears
- [ ] Mark all as read → all dots gone, counter resets

**AI Chatbot**
- [ ] Open Chrona Nexus → welcome message appears
- [ ] Tap "Daily standup" → responds with workspace summary
- [ ] Tap "Who's available?" → only shows members with status = available
- [ ] Type "What are my tasks?" → returns ONLY current user's tasks (not all tasks)
- [ ] Type "Create a task: Smoke test task, assign to Aiden Brookes" → task created, assigned to Aiden, Aiden receives real-time notification
- [ ] Type "What meetings do I have this week?" → returns correct calendar events from database
- [ ] AI does NOT hallucinate about non-existent people or fake task/calendar data

**Other Core Features**
- [ ] Create a project → appears in projects list
- [ ] Open a project → kanban board loads with project tasks
- [ ] Invite a member → invite appears in Pending Invitations
- [ ] Calendar loads → can create and see a new event
- [ ] Chat loads → can send a message → message appears for other users in real-time
- [ ] Rewards page → leaderboard loads with scores and podium
- [ ] Docs → create a new doc, type content, verify auto-save
- [ ] Settings / Profile → can update name and it saves

---

---

# SECTION 28 — BUG REPORT TEMPLATE

When you find a bug, copy and fill in this template exactly:

```
╔══════════════════════════════════════════╗
║           BUG REPORT                    ║
╚══════════════════════════════════════════╝

Section:        [e.g. Section 29 — Task Notification Flow]
Step #:         [e.g. Step 4]
Severity:       Critical / High / Medium / Low
Title:          [One-line summary of the bug]

Environment:
  Browser:      [Chrome 125 / Safari 17 / Firefox 127]
  OS:           [Windows 11 / macOS 14 / iOS 17]
  Screen size:  [1920×1080 / 375×812 (mobile)]
  Logged in as: [Role — e.g. Manager / Member]
  User:         [e.g. Mishal Boss / Aiden Brookes]

Steps to Reproduce:
  1.
  2.
  3.

Expected Result:
  [What should have happened according to the test plan]

Actual Result:
  [What actually happened — be specific]

Screenshot / Video:
  [Attach file or paste link]

──────────────────────────────────────────

Severity Guide:
  Critical  — App crashes, data lost, cannot proceed, broken login/auth
  High      — Core feature broken, no workaround
  Medium    — Feature partially broken, workaround exists
  Low       — Cosmetic issue, typo, minor visual glitch
```

---

*End of Chrona QA Test Plan — v2.0*
*Total Sections: 32 | Total Test Cases: 400+*
*Last Updated: June 2026*


When you find a bug, copy and fill in this template exactly:

```
╔══════════════════════════════════════════╗
║           BUG REPORT                    ║
╚══════════════════════════════════════════╝

Section:        [e.g. Section 6 — Kanban Board]
Step #:         [e.g. Step 4]
Severity:       Critical / High / Medium / Low
Title:          [One-line summary of the bug]

Environment:
  Browser:      [Chrome 125 / Safari 17 / Firefox 127]
  OS:           [Windows 11 / macOS 14 / iOS 17]
  Screen size:  [1920×1080 / 375×812 (mobile)]
  Logged in as: [Role — e.g. Manager]

Steps to Reproduce:
  1.
  2.
  3.

Expected Result:
  [What should have happened according to the test plan]

Actual Result:
  [What actually happened — be specific]

Screenshot / Video:
  [Attach file or paste link]

──────────────────────────────────────────

Severity Guide:
  Critical  — App crashes, data lost, cannot proceed, broken login/auth
  High      — Core feature broken, no workaround
  Medium    — Feature partially broken, workaround exists
  Low       — Cosmetic issue, typo, minor visual glitch
```

---

*End of Chrona QA Test Plan — v1.0*
*Total Sections: 28 | Total Test Cases: 300+*
