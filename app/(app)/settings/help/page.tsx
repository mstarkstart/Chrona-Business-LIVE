import {
  BookOpen,
  Users,
  ShieldCheck,
  UserCog,
  User,
  CheckSquare,
  Calendar,
  Clock,
  LayoutDashboard,
  Brain,
  Bell,
  Building2,
  HelpCircle,
  ArrowRight,
  BarChart2,
} from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "Why is the app slow when I click around?",
    a: "In the current development environment, pages are built on-demand as you visit them. When deployed to production (e.g., Vercel), navigation will be instant.",
  },
  {
    q: "Are changes real-time?",
    a: "Yes! Task updates, status changes, and dashboard metrics sync in real-time across all active users in the workspace.",
  },
  {
    q: "What can the AI do?",
    a: "Chrona Nexus AI can assist you with answering questions, helping draft content, summarising your week, and surfacing workspace insights. Available on Pro plan.",
  },
  {
    q: "How do I change my role?",
    a: "Roles can only be changed by an Admin. Go to Organisation → Members, find the member, and use the role dropdown. Owners cannot have their role changed.",
  },
  {
    q: "Can I have multiple admins?",
    a: "Yes. A workspace can have multiple Admins. Each Admin has full control including billing and member management.",
  },
  {
    q: "What happens when I upgrade my plan?",
    a: "Upgrades take effect immediately. New features become available right away. Billing is pro-rated for the remainder of your current cycle. (Billing processing is coming soon.)",
  },
  {
    q: "What is Chrona Nexus AI and how do I access it?",
    a: "Nexus AI is Chrona's embedded AI assistant, exclusive to the Pro plan. Once on Pro, it is accessible from the Chat page in the sidebar. No setup is required — it automatically understands your workspace context.",
  },
  {
    q: "Can I use Chrona on mobile?",
    a: "The web app is fully responsive and works well on mobile browsers. A native mobile app is on the roadmap. For now, add the site to your home screen for an app-like experience.",
  },
  {
    q: "How do I invite a new team member?",
    a: "Admins and Managers can invite members from Organisation → Members. Enter their email, select a role and department, and send the invite.",
  },
  {
    q: "What is the difference between a task status and a member status?",
    a: "Task status (To Do, In Progress, In Review, Done) describes where a piece of work is in its lifecycle. Member status (Available, Deep Work, etc.) describes a person's current working availability. They are independent of each other.",
  },
  {
    q: "Is data backed up?",
    a: "Yes. All workspace data is stored in a managed cloud database with automatic daily backups. Business plan customers receive additional SLA guarantees on data durability.",
  },
];

function SectionCard({
  icon,
  title,
  children,
  accent = "text-indigo-500",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section className="bg-white/80 border border-border rounded-2xl p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
        <span className={accent}>{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight">How to Use</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete guides for every role and feature in Chrona.
        </p>
      </div>

      <div className="space-y-6 animate-fade-up delay-100">

        {/* Roles */}
        <SectionCard icon={<Users className="h-5 w-5" />} title="Understanding Roles">
          <p className="text-sm text-foreground/70 mb-4">
            Every Chrona workspace member has one of three roles. Your role determines what you can see and do.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-bold text-indigo-800">Admin</span>
              </div>
              <ul className="space-y-1 text-xs text-indigo-700/80 leading-relaxed">
                <li>• Full control over workspace settings</li>
                <li>• Invite, remove, and change member roles</li>
                <li>• Access all projects and departments</li>
                <li>• Configure automations and integrations</li>
                <li>• View all analytics and timesheets</li>
                <li>• Manage billing and plan upgrades</li>
              </ul>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-violet-600" />
                <span className="text-sm font-bold text-violet-800">Manager</span>
              </div>
              <ul className="space-y-1 text-xs text-violet-700/80 leading-relaxed">
                <li>• Create, assign, and approve tasks</li>
                <li>• Manage projects within their department</li>
                <li>• View team status and timesheets</li>
                <li>• Access department analytics</li>
                <li>• Set and reassign task priorities</li>
                <li>• Cannot change workspace settings or billing</li>
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-800">Employee</span>
              </div>
              <ul className="space-y-1 text-xs text-emerald-700/80 leading-relaxed">
                <li>• View and update their own assigned tasks</li>
                <li>• Log time and submit timesheets</li>
                <li>• Update their working status</li>
                <li>• Participate in workspace chat</li>
                <li>• View team dashboard (read-only)</li>
                <li>• Cannot create or delete projects</li>
              </ul>
            </div>
          </div>
        </SectionCard>

        {/* Getting Started */}
        <SectionCard icon={<BookOpen className="h-5 w-5" />} title="Getting Started">
          <div className="space-y-4 text-sm text-foreground/80 leading-relaxed">
            <p>
              <strong>1. Managing Tasks:</strong> Go to the{" "}
              <span className="font-medium text-foreground">My Work</span> tab to
              view your assigned tasks. You can drag and drop cards between columns
              (To Do, In Progress, Done) to update their status.
            </p>
            <p>
              <strong>2. Updating Your Status:</strong> In the sidebar (bottom left
              or top right when collapsed), click your avatar or hover over it to
              change your current working status (Available, In a Meeting, Deep
              Work, etc.). This instantly updates for everyone in the workspace.
            </p>
            <p>
              <strong>3. Time Tracking:</strong> Use the{" "}
              <span className="font-medium text-foreground">Time Tracking</span>{" "}
              page to log hours against specific projects and tasks. Ensure you
              submit your timesheet at the end of the week.
            </p>
            <p>
              <strong>4. Team Dashboard:</strong> The{" "}
              <span className="font-medium text-foreground">Home Dashboard</span>{" "}
              provides a real-time overview of your team&apos;s progress, showing who is
              online and highlighting tasks that need immediate attention.
            </p>
            <p>
              <strong>5. Using the AI Assistant:</strong> Click the brain/chat icon
              in the sidebar to open{" "}
              <span className="font-medium text-foreground">Chrona Nexus AI</span>.
              Ask it to summarise your week, explain a task, draft a reply, or
              answer questions about your workspace. Available on Pro plan and above.
            </p>
            <p>
              <strong>6. Navigating Workspaces:</strong> If you belong to multiple
              workspaces, use the workspace switcher at the top of the sidebar to
              switch contexts. Each workspace has its own members, projects, and data.
            </p>
          </div>
        </SectionCard>

        {/* Task Management */}
        <SectionCard icon={<CheckSquare className="h-5 w-5" />} title="Task Management">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-foreground/80 leading-relaxed">
            <div className="space-y-1">
              <h3 className="font-semibold text-xs uppercase tracking-wide text-indigo-600">
                Creating Tasks
              </h3>
              <p>
                Use the <strong>+</strong> button or the quick-action shortcut to
                create a new task. Fill in the title, assign a project, set a
                priority, add a due date, and optionally assign it to a team member.
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-xs uppercase tracking-wide text-indigo-600">
                Assigning Tasks
              </h3>
              <p>
                Open any task and use the <strong>Assignee</strong> field to pick a
                team member. Managers can also bulk-reassign from the project board
                view.
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-xs uppercase tracking-wide text-indigo-600">
                Drag &amp; Drop Status
              </h3>
              <p>
                On the <strong>My Work</strong> and project boards, drag task cards
                between columns — <em>To Do</em>, <em>In Progress</em>,{" "}
                <em>In Review</em>, and <em>Done</em> — to update their status in
                real time.
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-xs uppercase tracking-wide text-indigo-600">
                Subtasks
              </h3>
              <p>
                Inside a task detail page, use the <strong>Subtasks</strong> section
                to break work into smaller checkable steps. Subtasks count toward
                the parent task&apos;s completion percentage.
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-xs uppercase tracking-wide text-indigo-600">
                Approvals
              </h3>
              <p>
                Tasks can be flagged as requiring approval. When a team member marks
                them done, the assigned approver receives a notification to review
                and accept or return the task. (Starter plan and above.)
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-xs uppercase tracking-wide text-indigo-600">
                Priorities &amp; Labels
              </h3>
              <p>
                Four priority levels control visual urgency:{" "}
                <strong>Urgent</strong> (red), <strong>High</strong> (orange),{" "}
                <strong>Normal</strong> (yellow), <strong>Low</strong> (green).
                Cards are colour-coded with glows at higher priorities.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Calendar */}
        <SectionCard
          icon={<Calendar className="h-5 w-5" />}
          title="Calendar &amp; Scheduling"
          accent="text-violet-500"
        >
          <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
            <p>
              Navigate to the <strong>Calendar</strong> page from the sidebar to see
              all tasks and events plotted against time. Switch between{" "}
              <strong>Week view</strong> and <strong>Month view</strong> using the
              toggle at the top.
            </p>
            <ul className="space-y-2">
              {[
                {
                  label: "Week view",
                  desc: "See each team member's tasks laid out day-by-day. Useful for spotting overloaded days or scheduling gaps.",
                },
                {
                  label: "Month view",
                  desc: "A high-level overview of due dates and milestones across the whole month.",
                },
                {
                  label: "Creating events",
                  desc: "Click any date cell to create a new task or event directly from the calendar.",
                },
                {
                  label: "Filters",
                  desc: "Use the member and project filters to reduce the calendar to a specific person or project's workload.",
                },
              ].map(({ label, desc }) => (
                <li key={label} className="flex items-start gap-2 list-none">
                  <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-indigo-400 shrink-0" />
                  <span>
                    <strong>{label}:</strong> {desc}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Calendar &amp; Scheduling is available on Starter plan and above.
            </p>
          </div>
        </SectionCard>

        {/* Time Tracking */}
        <SectionCard
          icon={<Clock className="h-5 w-5" />}
          title="Time Tracking"
          accent="text-amber-500"
        >
          <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
            <p>
              The <strong>Time Tracking</strong> page (under Timesheets in the
              sidebar) lets every team member log hours against specific tasks and
              projects.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">
                  Logging Hours
                </h3>
                <p>
                  Select a task from the dropdown, enter the hours worked, add an
                  optional note, and save. Entries appear in a weekly grid view
                  grouped by day.
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">
                  Submitting Timesheets
                </h3>
                <p>
                  At the end of each week, click <strong>Submit Timesheet</strong>{" "}
                  to lock your entries and send them to your manager for review.
                  Submitted timesheets cannot be edited without manager approval.
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">
                  Reviewing as a Manager
                </h3>
                <p>
                  Managers see a <strong>Review</strong> tab listing all pending
                  team submissions. You can approve, request changes, or flag
                  anomalies. Approved timesheets feed into workspace analytics.
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">
                  Billable vs Non-Billable
                </h3>
                <p>
                  Each log entry can be marked as billable or non-billable. This
                  distinction is visible in project reports and client-facing exports
                  (coming soon).
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Dashboard */}
        <SectionCard
          icon={<LayoutDashboard className="h-5 w-5" />}
          title="Home Dashboard"
          accent="text-blue-500"
        >
          <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
            <p>
              The <strong>Dashboard</strong> is your real-time command centre. It
              updates live as team members take actions anywhere in the workspace.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {[
                {
                  label: "Online Now",
                  desc: "Shows which team members are currently active, their working status, and when they were last seen.",
                },
                {
                  label: "Task Completion Rate",
                  desc: "Percentage of tasks completed vs. total tasks due this week — a quick health indicator for the team's momentum.",
                },
                {
                  label: "Overdue Tasks",
                  desc: "Highlights tasks that have passed their due date without being completed. Managers can click through to reassign or extend deadlines.",
                },
                {
                  label: "Department Breakdown",
                  desc: "Bar chart showing task completion rates split by department. Useful for spotting which teams are ahead or behind.",
                },
                {
                  label: "Focus Hours",
                  desc: "Aggregates logged time entries for the current week, showing total productive hours across the workspace.",
                },
                {
                  label: "Recent Activity",
                  desc: "A live feed of task status changes, new assignments, and approvals from the last 24 hours.",
                },
              ].map(({ label, desc }) => (
                <div
                  key={label}
                  className="rounded-xl border border-border bg-white/50 p-3"
                >
                  <p className="text-xs font-bold text-foreground mb-0.5">{label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Nexus AI */}
        <SectionCard
          icon={<Brain className="h-5 w-5" />}
          title="Chrona Nexus AI"
          accent="text-indigo-600"
        >
          <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md text-white"
                style={{
                  background: "linear-gradient(120deg, #4338ca, #8b5cf6)",
                }}
              >
                Pro Exclusive
              </span>
            </div>
            <p>
              <strong>Chrona Nexus AI</strong> is the embedded AI intelligence layer
              available to all Pro plan workspaces. It understands your workspace
              context — your tasks, team, deadlines, and history — to provide
              relevant, actionable assistance.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {[
                {
                  label: "Ask Anything",
                  desc: 'Type a natural-language question like "What is overdue this week?" or "Who has the most tasks?" and Nexus will answer using live workspace data.',
                },
                {
                  label: "Summarise Work",
                  desc: "Ask Nexus to summarise a team member's week, a project's status, or your own completed work — useful for stand-ups and reports.",
                },
                {
                  label: "Draft Content",
                  desc: "Get Nexus to draft task descriptions, meeting notes, project briefs, or status update messages that match your team's context.",
                },
                {
                  label: "Smart Suggestions",
                  desc: "Nexus proactively surfaces tasks at risk, suggests reassignments when someone is overloaded, and flags deadline conflicts.",
                },
                {
                  label: "Workspace Q&A",
                  desc: 'Ask process questions like "How do I submit a timesheet?" and get instant contextual answers.',
                },
                {
                  label: "How to Access",
                  desc: "Open the Chat page from the sidebar and start a conversation. Available 24/7 with no usage limits on Pro.",
                },
              ].map(({ label, desc }) => (
                <div
                  key={label}
                  className="rounded-xl p-3"
                  style={{
                    background:
                      "linear-gradient(120deg, rgba(67,56,202,0.05) 0%, rgba(139,92,246,0.07) 100%)",
                    border: "1px solid rgba(99,102,241,0.15)",
                  }}
                >
                  <p className="text-xs font-bold text-indigo-700 mb-0.5">{label}</p>
                  <p className="text-xs text-foreground/70 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Analytics */}
        <SectionCard
          icon={<BarChart2 className="h-5 w-5" />}
          title="Analytics &amp; Reports"
          accent="text-emerald-500"
        >
          <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
            <p>
              The <strong>Analytics</strong> section (available on Pro and above)
              gives Admins and Managers deep insight into how the workspace is
              performing over time.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  label: "Productivity Trends",
                  desc: "Line charts showing task completion velocity week over week. Spot seasonal slowdowns or momentum spikes.",
                },
                {
                  label: "Workload Distribution",
                  desc: "See how tasks are spread across team members. Identify overloaded employees before burnout occurs.",
                },
                {
                  label: "Project Health",
                  desc: "Per-project breakdown of completion rate, overdue percentage, and estimated vs. actual time logged.",
                },
                {
                  label: "Custom Date Ranges",
                  desc: "Filter all analytics to any custom date range — useful for sprint retrospectives and quarterly reviews.",
                },
              ].map(({ label, desc }) => (
                <div key={label} className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    {label}
                  </h3>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Notifications & Status */}
        <SectionCard
          icon={<Bell className="h-5 w-5" />}
          title="Notifications &amp; Status System"
          accent="text-rose-500"
        >
          <div className="space-y-5 text-sm text-foreground/80 leading-relaxed">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-foreground mb-2">
                Notification Types
              </h3>
              <ul className="space-y-1.5">
                {[
                  {
                    color: "text-rose-400",
                    label: "Task assigned",
                    desc: "You receive a notification whenever a task is assigned to you or updated.",
                  },
                  {
                    color: "text-amber-400",
                    label: "Approaching deadline",
                    desc: "A reminder fires 24 hours before a task's due date.",
                  },
                  {
                    color: "text-red-400",
                    label: "Overdue alert",
                    desc: "Fires when a task passes its due date without being completed.",
                  },
                  {
                    color: "text-indigo-400",
                    label: "Approval required",
                    desc: "Notifies approvers when a task is submitted for review.",
                  },
                  {
                    color: "text-green-400",
                    label: "Task approved / returned",
                    desc: "Notifies the original assignee of the approval outcome.",
                  },
                ].map(({ color, label, desc }) => (
                  <li key={label} className="flex items-start gap-2 list-none">
                    <Bell className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
                    <span>
                      <strong>{label}:</strong> {desc}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-foreground mb-2">
                Working Status Types
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  {
                    status: "Available",
                    color: "bg-green-400",
                    desc: "Ready for tasks and messages.",
                  },
                  {
                    status: "In a Meeting",
                    color: "bg-amber-400",
                    desc: "Temporarily unavailable.",
                  },
                  {
                    status: "Deep Work",
                    color: "bg-indigo-400",
                    desc: "Focused — minimise interruptions.",
                  },
                  {
                    status: "On Break",
                    color: "bg-blue-400",
                    desc: "Short pause, back soon.",
                  },
                  {
                    status: "Out of Office",
                    color: "bg-gray-400",
                    desc: "Away for the day or longer.",
                  },
                  {
                    status: "Offline",
                    color: "bg-gray-300",
                    desc: "Not active in the workspace.",
                  },
                ].map(({ status, color, desc }) => (
                  <div
                    key={status}
                    className="flex items-start gap-2 rounded-xl border border-border bg-white/50 p-2.5"
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full mt-0.5 shrink-0 ${color}`}
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {status}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Workspaces */}
        <SectionCard
          icon={<Building2 className="h-5 w-5" />}
          title="Workspaces"
          accent="text-purple-500"
        >
          <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
            <p>
              A <strong>workspace</strong> is the top-level container for your
              organisation in Chrona. All members, projects, tasks, and data belong
              to a single workspace.
            </p>
            <ul className="space-y-2">
              {[
                {
                  label: "Multiple workspaces",
                  desc: "You can belong to more than one workspace (e.g., a freelancer working for multiple clients). Use the workspace switcher at the top of the sidebar to move between them.",
                },
                {
                  label: "Creating a workspace",
                  desc: "New workspaces can be created from the workspace switcher. Each has its own plan, billing, and member roster.",
                },
                {
                  label: "Workspace settings",
                  desc: "Admins can configure the workspace name, industry, logo, and default estimates under Settings → Workspace.",
                },
                {
                  label: "Departments",
                  desc: "Organise members into departments (e.g., Engineering, Marketing, Sales). Departments enable department-scoped analytics and manager assignment.",
                },
                {
                  label: "Data isolation",
                  desc: "Each workspace's data is fully isolated. Members in Workspace A cannot see anything from Workspace B.",
                },
              ].map(({ label, desc }) => (
                <li key={label} className="flex items-start gap-2 list-none">
                  <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-purple-400 shrink-0" />
                  <span>
                    <strong>{label}:</strong> {desc}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </SectionCard>

        {/* FAQ */}
        <SectionCard
          icon={<HelpCircle className="h-5 w-5" />}
          title="Frequently Asked Questions"
          accent="text-blue-500"
        >
          <div className="space-y-5 text-sm text-foreground/80 leading-relaxed">
            {FAQ_ITEMS.map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-semibold text-foreground mb-1">{q}</h3>
                <p className="text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
