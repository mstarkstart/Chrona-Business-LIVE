// Weekly digest cron job — invoke via Vercel Cron or any HTTP scheduler.
//
// Add to vercel.json:
//   "crons": [{ "path": "/api/cron/weekly-digest", "schedule": "0 8 * * 1" }]
//
// Required env vars:
//   CRON_SECRET=any-random-string   ← add to .env.local and Vercel env
//   RESEND_API_KEY, FROM_EMAIL, NEXT_PUBLIC_APP_URL  ← already set

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendWeeklyDigestEmail } from "@/lib/email/send";
import type { DigestTask } from "@/lib/email/templates";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  // ── Auth check ────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn(
      "[cron/weekly-digest] CRON_SECRET is not set — running without auth. " +
      "Set CRON_SECRET=any-random-string in .env.local to protect this endpoint."
    );
  }

  // ── Fetch all active workspaces ───────────────────────────────────────────
  const { data: workspaces, error: wsErr } = await supabaseAdmin
    .from("workspaces")
    .select("id, name");

  if (wsErr || !workspaces) {
    console.error("[cron/weekly-digest] Failed to fetch workspaces:", wsErr);
    return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
  }

  const now = new Date();
  // "Past week" window: 7 days ago → now
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const today = now.toISOString();

  let totalSent = 0;
  let totalErrors = 0;

  for (const workspace of workspaces) {
    // Fetch active members with their profiles in one join.
    const { data: members, error: membersErr } = await supabaseAdmin
      .from("workspace_members")
      .select("user_id, profiles(first_name, last_name, personal_email)")
      .eq("workspace_id", workspace.id)
      .eq("status", "active");

    if (membersErr || !members) {
      console.error(`[cron/weekly-digest] workspace ${workspace.id} members error:`, membersErr);
      continue;
    }

    for (const member of members) {
      // profiles is returned as an object (single join) or null
      const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
      const email = profile?.personal_email;
      if (!email) continue;

      const userId = member.user_id;

      // ── Count completed tasks (past week) ───────────────────────────────
      const { count: completedCount } = await supabaseAdmin
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("assigned_to", userId)
        .eq("status", "completed")
        .gte("completed_at", weekAgo);

      // ── Count pending tasks ──────────────────────────────────────────────
      const { count: pendingCount } = await supabaseAdmin
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("assigned_to", userId)
        .in("status", ["pending", "in_progress", "awaiting_acceptance", "awaiting_approval"]);

      // ── Count overdue tasks (due_date < today, not completed) ────────────
      const { count: overdueCount } = await supabaseAdmin
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("assigned_to", userId)
        .in("status", ["pending", "in_progress", "awaiting_acceptance", "awaiting_approval"])
        .lt("due_date", today.slice(0, 10));

      // ── Top priority tasks (up to 5, urgent/high first) ─────────────────
      const { data: topTasksRaw } = await supabaseAdmin
        .from("tasks")
        .select("title, priority, due_date")
        .eq("workspace_id", workspace.id)
        .eq("assigned_to", userId)
        .in("status", ["pending", "in_progress", "awaiting_acceptance"])
        .order("priority", { ascending: false }) // lexicographic: urgent > normal > low > high — not ideal but acceptable
        .limit(5);

      const topTasks: DigestTask[] = (topTasksRaw ?? []).map((t) => ({
        title: t.title,
        priority: t.priority ?? "normal",
        dueDate: t.due_date ?? null,
      }));

      const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || email;

      const result = await sendWeeklyDigestEmail({
        to: email,
        userName,
        workspaceName: workspace.name,
        completedCount: completedCount ?? 0,
        pendingCount: pendingCount ?? 0,
        overdueCount: overdueCount ?? 0,
        topTasks,
      });

      if (result.ok) {
        totalSent++;
      } else {
        totalErrors++;
        console.error(`[cron/weekly-digest] failed to send to ${email}:`, result.error);
      }
    }
  }

  console.log(`[cron/weekly-digest] done — sent: ${totalSent}, errors: ${totalErrors}`);
  return NextResponse.json({ ok: true, sent: totalSent, errors: totalErrors });
}
