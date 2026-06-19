import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendMorningSummaryEmail } from "@/lib/email/send";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  // ── Auth check ────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI credentials not configured" }, { status: 500 });
  }

  // ── Fetch all active workspaces ───────────────────────────────────────────
  const { data: workspaces, error: wsErr } = await supabaseAdmin
    .from("workspaces")
    .select("id, name");

  if (wsErr || !workspaces) {
    return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const todayStr = now.toISOString().slice(0, 10);

  let totalSent = 0;
  let totalErrors = 0;

  for (const workspace of workspaces) {
    // 1. Fetch managers/admins/owners
    const { data: managers, error: mgrErr } = await supabaseAdmin
      .from("workspace_members")
      .select("user_id, role, profiles(first_name, last_name, personal_email)")
      .eq("workspace_id", workspace.id)
      .eq("status", "active")
      .in("role", ["owner", "admin", "manager"]);

    if (mgrErr || !managers || managers.length === 0) continue;

    // 2. Fetch tasks completed yesterday
    const { data: completedTasks } = await supabaseAdmin
      .from("tasks")
      .select("title, assigned_to, profiles!tasks_assigned_to_profiles_fkey(first_name, last_name)")
      .eq("workspace_id", workspace.id)
      .eq("status", "completed")
      .gte("completed_at", yesterday);

    // 3. Fetch active blockers / overdue tasks
    const { data: activeTasks } = await supabaseAdmin
      .from("tasks")
      .select("title, status, due_date, assigned_to, profiles!tasks_assigned_to_profiles_fkey(first_name, last_name)")
      .eq("workspace_id", workspace.id)
      .in("status", ["pending", "in_progress", "awaiting_acceptance", "awaiting_approval"])
      .or(`due_date.lt.${todayStr},status.eq.in_progress`);

    // 4. Fetch recent activity logs from yesterday
    const { data: logs } = await supabaseAdmin
      .from("activity_log")
      .select("status, started_at, ended_at, workspace_members(profiles(first_name, last_name)), tasks(title)")
      .eq("workspace_id", workspace.id)
      .gte("started_at", yesterday)
      .order("started_at", { ascending: false })
      .limit(15);

    // Format summaries for the AI prompt
    const completedSummary = (completedTasks ?? []).map((t) => {
      const p = t.profiles as unknown as { first_name?: string; last_name?: string } | null;
      const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Unassigned";
      return `- Completed: "${t.title}" (by ${name})`;
    }).join("\n") || "No tasks completed yesterday.";

    const activeSummary = (activeTasks ?? []).map((t) => {
      const p = t.profiles as unknown as { first_name?: string; last_name?: string } | null;
      const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Unassigned";
      const isOverdue = t.due_date && t.due_date < todayStr;
      const desc = isOverdue ? `OVERDUE (due: ${t.due_date})` : `In Progress`;
      return `- [${t.status.toUpperCase()}] "${t.title}" (${name}) - Status: ${desc}`;
    }).join("\n") || "No blockers or overdue tasks.";

    const logSummary = (logs ?? []).map((l) => {
      const m = l.workspace_members as unknown as { profiles?: { first_name?: string; last_name?: string } } | null;
      const name = [m?.profiles?.first_name, m?.profiles?.last_name].filter(Boolean).join(" ") || "Member";
      const taskTitle = l.tasks ? `working on "${(l.tasks as unknown as { title: string }).title}"` : `in state "${l.status}"`;
      return `- ${name} was ${taskTitle} at ${new Date(l.started_at).toLocaleTimeString()}`;
    }).join("\n") || "No logged status updates.";

    // 5. Query Gemini via OpenRouter to synthesize the standup summary
    const prompt = `You are Chrona Nexus, a workforce productivity assistant. Write a concise, professional, structured morning standup summary for the company "${workspace.name}".
Keep the summary to 3-4 short bullet points. Highlight yesterday's achievements, today's current focus, and call out blockers or overdue deadlines.

Yesterday's Completed Tasks:
${completedSummary}

Current Active/Overdue Tasks:
${activeSummary}

Recent Team Status Activities:
${logSummary}

Return only the summarized bullet points (Markdown is fine, do not include code blocks or wraps).`;

    let summaryText = "";
    try {
      const upstreamRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://chrona.app",
          "X-Title": "Chrona V1",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          stream: false,
          max_tokens: 600,
          messages: [
            { role: "system", content: "You are a professional project manager. Write brief bullet points summary." },
            { role: "user", content: prompt }
          ],
        }),
      });

      if (upstreamRes.ok) {
        const data = await upstreamRes.json();
        summaryText = data.choices?.[0]?.message?.content ?? "";
      }
    } catch (err) {
      console.error("[cron/standup] OpenRouter request failed:", err);
      continue;
    }

    if (!summaryText) continue;

    // 6. Email summary to all managers
    for (const manager of managers) {
      const profile = Array.isArray(manager.profiles) ? manager.profiles[0] : manager.profiles;
      const email = profile?.personal_email;
      if (!email) continue;

      const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || email;
      const result = await sendMorningSummaryEmail({
        to: email,
        userName,
        workspaceName: workspace.name,
        summaryText,
      });

      if (result.ok) {
        totalSent++;
      } else {
        totalErrors++;
        console.error(`[cron/standup] failed to send to ${email}:`, result.error);
      }
    }
  }

  return NextResponse.json({ ok: true, sent: totalSent, errors: totalErrors });
}
