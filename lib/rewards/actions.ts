"use server";
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type LeaderboardEntry = {
  userId: string;
  name: string;
  points: number;
  tasksCompleted: number;
  streakDays: number;
};

/**
 * Awards points to a user when they complete a task.
 * Uses supabaseAdmin to bypass RLS — called from server actions only.
 */
export async function awardPointsForTask(
  taskId: string,
  workspaceId: string,
  userId: string,
  completedEarly: boolean,
): Promise<void> {
  const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

  // Fetch current member_points row (may not exist yet)
  const { data: existing } = await supabaseAdmin
    .from("member_points")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  // ── Determine bonus events ────────────────────────────────────────────────
  const basePoints = 10;
  const earlyBonus = completedEarly ? 5 : 0;

  // First task of the day bonus: no activity today yet
  const isFirstTaskToday = !existing || existing.last_activity !== today;
  const firstTaskBonus = isFirstTaskToday ? 3 : 0;

  const totalPoints = basePoints + earlyBonus + firstTaskBonus;

  // ── Streak logic ──────────────────────────────────────────────────────────
  let newStreak = 1;
  if (existing) {
    if (existing.last_activity === yesterday) {
      newStreak = (existing.streak_days ?? 0) + 1;
    } else if (existing.last_activity === today) {
      newStreak = existing.streak_days ?? 1;
    }
    // else: gap > 1 day → reset to 1
  }

  // ── Streak bonus (7-day milestone) ────────────────────────────────────────
  const streakBonus = newStreak > 0 && newStreak % 7 === 0 ? 25 : 0;
  const grandTotal = totalPoints + streakBonus;

  // ── Upsert member_points ──────────────────────────────────────────────────
  if (existing) {
    await supabaseAdmin
      .from("member_points")
      .update({
        points: existing.points + grandTotal,
        tasks_completed: existing.tasks_completed + 1,
        streak_days: newStreak,
        last_activity: today,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);
  } else {
    await supabaseAdmin.from("member_points").insert({
      workspace_id: workspaceId,
      user_id: userId,
      points: grandTotal,
      tasks_completed: 1,
      streak_days: 1,
      last_activity: today,
    });
  }

  // ── Insert point_events rows ──────────────────────────────────────────────
  const events: {
    workspace_id: string;
    user_id: string;
    event_type: string;
    points: number;
    description: string;
    task_id: string;
  }[] = [
    {
      workspace_id: workspaceId,
      user_id: userId,
      event_type: "task_completed",
      points: basePoints,
      description: "Task completed",
      task_id: taskId,
    },
  ];

  if (earlyBonus > 0) {
    events.push({
      workspace_id: workspaceId,
      user_id: userId,
      event_type: "task_early",
      points: earlyBonus,
      description: "Completed before due date",
      task_id: taskId,
    });
  }

  if (firstTaskBonus > 0) {
    events.push({
      workspace_id: workspaceId,
      user_id: userId,
      event_type: "first_task",
      points: firstTaskBonus,
      description: "First task of the day",
      task_id: taskId,
    });
  }

  if (streakBonus > 0) {
    events.push({
      workspace_id: workspaceId,
      user_id: userId,
      event_type: "streak_bonus",
      points: streakBonus,
      description: `${newStreak}-day streak bonus!`,
      task_id: taskId,
    });
  }

  await supabaseAdmin.from("point_events").insert(events);
}

/**
 * Returns the leaderboard for a workspace, top 10 by points desc.
 */
export async function getLeaderboard(workspaceId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("member_points")
    .select("user_id, points, tasks_completed, streak_days")
    .eq("workspace_id", workspaceId)
    .order("points", { ascending: false })
    .limit(10);

  if (error || !data) return [];

  // Resolve names via profiles
  const userIds = data.map((r) => r.user_id);
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, preferred_name")
    .in("id", userIds);

  const nameOf = (uid: string): string => {
    const p = profiles?.find((x) => x.id === uid);
    if (!p) return "Member";
    return p.preferred_name ?? ([p.first_name, p.last_name].filter(Boolean).join(" ") || "Member");
  };

  return data.map((row) => ({
    userId: row.user_id,
    name: nameOf(row.user_id),
    points: row.points,
    tasksCompleted: row.tasks_completed,
    streakDays: row.streak_days,
  }));
}
