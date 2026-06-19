"use server";

import { requireActiveWorkspace } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function generateStandupSummaryAction() {
  const active = await requireActiveWorkspace();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("AI credentials not configured in environment variables");
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const todayStr = now.toISOString().slice(0, 10);

  // 1. Fetch completed tasks
  const { data: completedTasks } = await supabaseAdmin
    .from("tasks")
    .select("title, assigned_to, profiles!tasks_assigned_to_profiles_fkey(first_name, last_name)")
    .eq("workspace_id", active.workspace.id)
    .eq("status", "completed")
    .gte("completed_at", yesterday);

  // 2. Fetch active/overdue tasks
  const { data: activeTasks } = await supabaseAdmin
    .from("tasks")
    .select("title, status, due_date, assigned_to, profiles!tasks_assigned_to_profiles_fkey(first_name, last_name)")
    .eq("workspace_id", active.workspace.id)
    .in("status", ["pending", "in_progress", "awaiting_acceptance", "awaiting_approval"])
    .or(`due_date.lt.${todayStr},status.eq.in_progress`);

  // 3. Fetch activity log
  const { data: logs } = await supabaseAdmin
    .from("activity_log")
    .select("status, started_at, ended_at, workspace_members(profiles(first_name, last_name)), tasks(title)")
    .eq("workspace_id", active.workspace.id)
    .gte("started_at", yesterday)
    .order("started_at", { ascending: false })
    .limit(15);

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

  const prompt = `You are Chrona Nexus, a workforce productivity assistant. Write a concise, professional, structured morning standup summary for the company "${active.workspace.name}".
Keep the summary to 3-4 short bullet points. Highlight yesterday's achievements, today's current focus, and call out blockers or overdue deadlines.

Yesterday's Completed Tasks:
${completedSummary}

Current Active/Overdue Tasks:
${activeSummary}

Recent Team Status Activities:
${logSummary}

Return only the summarized bullet points (Markdown is fine, do not include code blocks or wraps).`;

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

    if (!upstreamRes.ok) {
      throw new Error("Failed to communicate with AI service");
    }

    const data = await upstreamRes.json();
    return data.choices?.[0]?.message?.content ?? "No summary could be synthesized.";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`AI synthesis failed: ${msg}`);
  }
}
