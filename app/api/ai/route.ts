import { type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/auth/session";

type Action = "draft_description" | "suggest_tasks" | "smart_duedate" | "summarize_comments" | "general_chat";

// ─── Chrona Platform Knowledge Base ─────────────────────────────────────────
const CHRONA_PLATFORM_GUIDE = `
## Chrona Platform Guide — Know this to help users navigate and use every feature:

### 🏠 Dashboard (/dashboard)
- The main hub. Shows a real-time greeting, role badge, and today's date.
- Company/Team/Personal progress rings show task completion % by scope.
- Priority tasks section shows nearest deadlines with colour-coded urgency (red=urgent, orange=high, yellow=normal, green=healthy).
- Live Activity Stream shows all teammates' real-time status (online, meeting, focus, etc.).
- Most efficient / Most loaded panels show AI-calculated workload heuristics for managers.
- Quick action chips: Create Task, Calendar, Team Hub.

### 📝 My Work / Tasks (/tasks)
- Shows all tasks in the workspace.
- Two views: **List** (table with priority, status, due date) and **Board** (Kanban drag-and-drop).
- Filters: My Work (only your assigned tasks), Workspace (all tasks), Awaiting Approval.
- Create tasks with the "New Task" button — set title, priority, assignee, and due date.
- Drag tasks between columns (To Do → In Progress → Completed) in Board view for real-time status update.
- Priority colours: urgent (red glow), high (orange glow), normal (yellow), low (green).
- Tasks with "awaiting_approval" status need a manager/owner to approve them.

### 📅 Calendar (/calendar)
- Three views: **Today**, **Week**, **Month**.
- Two modes: **My Calendar** (personal events) and **Team Calendar** (all shared workspace events).
- Create events with title, type, date, start/end time.
- Event types: Meeting, Task Block, Break, Lunch, Training, Focus, Other — each with a unique colour.
- Toggle "Visible to everyone" checkbox to share an event on the Team Calendar.
- **Free Windows** panel intelligently finds open time slots in your schedule for the next 7 days.
- Live progress bar shows how much of your scheduled day has passed.

### 📁 Projects (/projects)
- Group related tasks under a project.
- Each project has a name, description, status (active/completed), and a list of tasks.
- Click a project to see its task board and progress ring.
- Create projects with the "New Project" button.

### 🏢 Organisation (/organisation)
- Overview of your company structure.
- Sub-pages: Members, Departments, Teams.
- Members list shows everyone in the workspace with their role, status, and department.
- Departments and Teams help you organise who works on what.

### ⏱️ Time Tracking (/timesheets)
- Log and review hours worked.
- Managers can see team timesheets and spot overworked employees.

### 💬 Chat (/chat)
- Internal messaging between workspace members.

### 📥 Inbox (/inbox)
- Notifications and messages directed at you.

### 🛡️ Approvals (/approvals)
- Tasks marked as "awaiting approval" appear here for managers/owners to review.
- Approve or reject tasks with one click.

### 🏆 Rewards (/rewards)
- Leaderboard showing who has completed the most tasks (gamification).
- Points are awarded automatically when tasks are marked as completed.

### ⚙️ Settings (/settings)
- Profile: Update your name, photo, and personal details.
- Business: Edit workspace name, industry, and company settings.
- Billing: View your plan and usage.
- Automations: Set up workflow triggers.
- Help: How-to guides for testers.

### 🤖 Chrona Nexus (Sparkles ✨ button in top bar)
- Access Chrona Nexus by clicking the purple Sparkles icon in the top navigation bar.
- Agentic AI that can answer questions, analyse workload, surface blockers, and suggest actions.
- Quick chips: Daily standup, Who's available?, Overdue tasks, Analyse workload, What's blocking us?, Suggest meeting time, Summarize workspace, Draft task description, Suggest next tasks.
- Can CREATE tasks: say "Create a task: [title], due [date], priority [level]".
- Can CREATE documents: say "Create a doc: [title]".
- Queries live workspace data: tasks, team members, presence status, recent activity.

### 🌙 Dark Mode
- Click your profile avatar (bottom-left of the left sidebar).
- In the popup menu, find the Appearance toggle to switch between Light and Dark mode.
- Your preference is saved automatically.

### 🔀 Workspace Switcher
- If you belong to multiple workspaces, click the workspace name at the top of the left sidebar.
- Select a different workspace to switch context.

### 👤 Profile & Status
- Click your avatar at the bottom-left of the left sidebar.
- Change your live status (Available, Meeting, Focus, Break, etc.) — teammates see this in real-time.
- Edit your profile photo, name, and role.

### ⌘K Command Palette
- Press Ctrl+K (or Cmd+K on Mac) anywhere in the app to open the global command palette.
- Search for pages, tasks, team members, and actions without touching the mouse.

### 🔔 Notifications
- The bell icon in the top-right shows unread notifications.
- You get notified when tasks are assigned to you, approved, or commented on.
`;

const BASE_SYSTEM_PROMPTS: Record<Action, string> = {
  draft_description:
    "You are a project manager. Generate a clear, professional task description (2-4 sentences) for this task title. Be specific and actionable.",
  suggest_tasks:
    "You are a project manager. Given the project context, suggest 5 logical next tasks as a JSON array of strings. Return only the JSON array.",
  smart_duedate:
    "You are a project planner. Suggest a realistic due date given workload context. Return a date in ISO format YYYY-MM-DD only.",
  summarize_comments:
    "You are a summarizer. Summarize these task comments in 2-3 sentences, focusing on decisions and blockers.",
  general_chat: `You are Chrona Nexus, an agentic workforce intelligence engine embedded inside the Chrona Business platform.
You are an expert on every feature of Chrona. You help users navigate the platform, manage tasks, analyse team workload, surface blockers, and answer any questions.
Be concise, insightful, and professional. Use emojis sparingly for warmth. When analysing workspace data (tasks, team presence, activity), synthesise it into actionable insights — don't just list raw data.

━━━ CRITICAL — AVAILABILITY RULE (never violate this) ━━━
"available" status = the ONLY status meaning a person is free and can take new tasks or be interrupted.
Every other status means they are BUSY and must NOT be listed as available:
• "tasking"      → actively working on a task. BUSY. Not available.
• "meeting"      → in a meeting. BUSY. Not available.
• "training"     → in a training session. BUSY. Not available.
• "lunch_break"  → on lunch. BUSY. Not available.
• "personal_time"→ personal time. BUSY. Not available.
• "offline"      → offline. Not available.
When asked who is "available", "free", "online", "active for work", "can take a task", "not busy", or any similar phrasing — look ONLY at the "Currently AVAILABLE" section of the presence data. NEVER include anyone from the "Currently BUSY" section in an availability answer. This rule is absolute.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If the user asks how to use Chrona, how to do something, where to find a feature, or asks about navigation — use the CHRONA_PLATFORM_GUIDE knowledge you have been given to give a clear, step-by-step answer.

When asked to analyse workload: look at who has the most/fewest tasks, flag anyone overloaded, and give a concise distribution summary.
When asked about blockers: identify tasks that are in_progress but have no recent update, or tasks awaiting approval that are stalled.
When asked to suggest a meeting time: check who is "available" in the presence data and suggest a time window that works.
When asked for a standup: summarise what's done, what's in progress, and flag any blockers or overdue items.

${CHRONA_PLATFORM_GUIDE}

You can CREATE TASKS on behalf of the user. When asked to create a task, respond with a helpful confirmation message
AND append a special JSON block exactly like this (no markdown fences, just plain text after your message):

[CREATE_TASK_ACTION]
{"title":"<task title>","description":"<description or null>","priority":"normal","due_date":"<YYYY-MM-DD or null>"}
[/CREATE_TASK_ACTION]

CRITICAL FOR TASK CREATION: Do NOT ask any clarifying or follow-up questions when asked to create a task. If the user doesn't specify a priority, description, or due date, immediately generate the [CREATE_TASK_ACTION] block using logical defaults (priority: "normal", description: null, due_date: null). Never ask the user to provide more details before executing.

You can CREATE DOCUMENTS on behalf of the user. When asked to create a doc or file, respond AND append:

[CREATE_DOC_ACTION]
{"title":"<doc title>","content":"<initial content>"}
[/CREATE_DOC_ACTION]

CRITICAL FOR DOCUMENT CREATION: Do NOT ask any clarifying or follow-up questions when asked to create a document. If parameters or content are missing, use logical defaults immediately. Never ask the user to provide more details before executing.

Only append these action blocks when the user explicitly asks you to create something. For general questions, just answer.`,
};

export async function POST(request: NextRequest) {
  // Auth check
  let authenticated = false;
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    authenticated = Boolean(authHeader.slice(7).trim());
  } else {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    authenticated = Boolean(user);
  }

  if (!authenticated) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse body
  let body: { action?: string; context?: string; workspaceId?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { action, context, workspaceId } = body;

  if (!action || !(action in BASE_SYSTEM_PROMPTS)) {
    return new Response(
      JSON.stringify({
        error: `Invalid action. Must be one of: ${Object.keys(BASE_SYSTEM_PROMPTS).join(", ")}`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI service not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Inject today's date so the AI never asks "what day is today?"
  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const datePrefix = `Today is ${todayStr}. You are Chrona Nexus, embedded inside the Chrona workspace management platform. Always respond based on today's date and the workspace context provided below. Never ask the user what day it is — you already know.\n\n`;

  // Build system prompt — for general_chat, inject live workspace context
  const validAction = action as Action;
  let systemPrompt = datePrefix + (Object.hasOwn(BASE_SYSTEM_PROMPTS, validAction) ? BASE_SYSTEM_PROMPTS[validAction] : "");
  if (action === "general_chat" && workspaceId) {
    try {
      const supabase = await createSupabaseServerClient();
      const active = await getActiveWorkspace();
      if (active) {
        const [{ data: tasks }, { data: members }, { data: presence }, { data: activity }, { data: currentUserProfile }] = await Promise.all([
          supabase
            .from("tasks")
            .select("id, title, status, priority, due_date, assigned_to")
            .eq("workspace_id", workspaceId)
            .not("status", "in", "(completed,cancelled)")
            .order("due_date", { ascending: true })
            .limit(30),
          supabase
            .from("workspace_members")
            .select("id, user_id, role, profiles!workspace_members_user_id_profiles_fkey(first_name, last_name)")
            .eq("workspace_id", workspaceId)
            .eq("status", "active")
            .limit(20),
          supabase
            .from("activity_status")
            .select("status, workspace_members!inner(profiles!workspace_members_user_id_profiles_fkey(first_name, last_name))")
            .eq("workspace_members.workspace_id", workspaceId)
            .limit(20),
          supabase
            .from("activity_log")
            .select("status, started_at, ended_at, workspace_members!inner(profiles!workspace_members_user_id_profiles_fkey(first_name, last_name)), tasks(title)")
            .eq("workspace_id", workspaceId)
            .order("started_at", { ascending: false })
            .limit(15),
          supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", active.member.user_id)
            .maybeSingle(),
        ]);

        // Build userId -> name map for task assignment resolution
        const userIdToName = new Map<string, string>();
        for (const m of (members ?? [])) {
          const p = (m as unknown as { profiles?: { first_name?: string; last_name?: string } }).profiles;
          const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Member";
          userIdToName.set(m.user_id, name);
        }

        const currentUserName = [currentUserProfile?.first_name, currentUserProfile?.last_name].filter(Boolean).join(" ") || "You";
        const currentUserId = active.member.user_id;

        const taskSummary = (tasks ?? []).map((t) => {
          const assigneeName = t.assigned_to
            ? (userIdToName.get(t.assigned_to) ?? `user:${t.assigned_to.slice(0,8)}`)
            : "Unassigned";
          const isCurrentUser = t.assigned_to === currentUserId;
          return `- [${t.status}] "${t.title}" | priority: ${t.priority} | due: ${t.due_date ?? "none"} | assigned to: ${assigneeName}${isCurrentUser ? " (YOU)" : ""}`;
        }).join("\n");


        const memberSummary = (members ?? []).map((m) => {
          const p = (m as unknown as { profiles?: { first_name?: string; last_name?: string } }).profiles;
          return `- ${[p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Member"} (${m.role})`;
        }).join("\n");

        const availableMembers: string[] = [];
        const busyMembers: string[] = [];
        for (const p of (presence ?? [])) {
          const m = p.workspace_members as unknown as { profiles?: { first_name?: string; last_name?: string } };
          const name = [m?.profiles?.first_name, m?.profiles?.last_name].filter(Boolean).join(" ") || "Member";
          if (p.status === "available") {
            availableMembers.push(`- ${name}`);
          } else {
            busyMembers.push(`- ${name} (${p.status})`);
          }
        }
        const presenceSummary = [
          "### Currently AVAILABLE (status: available — these people can be interrupted):",
          availableMembers.length > 0 ? availableMembers.join("\n") : "- Nobody is currently available",
          "",
          "### Currently BUSY (NOT available — do NOT list as available):",
          busyMembers.length > 0 ? busyMembers.join("\n") : "- Nobody is currently busy",
        ].join("\n");

        const activitySummary = (activity ?? []).map((a) => {
          const m = a.workspace_members as unknown as { profiles?: { first_name?: string; last_name?: string } };
          const name = [m?.profiles?.first_name, m?.profiles?.last_name].filter(Boolean).join(" ") || "Member";
          const taskTitle = a.tasks ? `working on "${(a.tasks as unknown as { title: string }).title}"` : `in state "${a.status}"`;
          const duration = a.ended_at
            ? `${Math.round((new Date(a.ended_at).getTime() - new Date(a.started_at).getTime()) / 60000)}m`
            : "ongoing";
          return `- ${name} was ${taskTitle} starting at ${new Date(a.started_at).toLocaleTimeString()} (${duration})`;
        }).join("\n");

        systemPrompt += `\n\n## Current Workspace: ${active.workspace.name}\n## You are talking to: ${currentUserName} (user ID: ${currentUserId})\n## IMPORTANT: When the user says "my tasks", "tasks assigned to me", or similar — filter the task list to ONLY tasks marked with "(YOU)" below.\n\n### Active Tasks (tasks marked with (YOU) are assigned to the current user speaking to you):\n${taskSummary || "No active tasks."}\n\n### Team Members:\n${memberSummary || "No members found."}\n\n### Live Presence Status:\n${presenceSummary}\n\n### Recent Team Activity:\n${activitySummary || "No recent activity."}`;
      }
    } catch {
      // Non-fatal — continue without workspace context
    }
  }

  // Call OpenRouter with streaming
  let upstreamRes: Response;
  try {
    upstreamRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://chrona.app",
        "X-Title": "Chrona V1",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        max_tokens: 1500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context ?? "" },
        ],
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: `Upstream fetch failed: ${msg}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!upstreamRes.ok) {
    const errText = await upstreamRes.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `OpenRouter error ${upstreamRes.status}: ${errText}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Pipe upstream SSE stream directly to the client
  const encoder = new TextEncoder();
  const upstreamBody = upstreamRes.body;

  const stream = new ReadableStream({
    async start(controller) {
      if (!upstreamBody) {
        controller.close();
        return;
      }

      const reader = upstreamBody.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
