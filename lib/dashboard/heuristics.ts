import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// All heuristics are heuristic-based (v1). No ML.

export async function efficientEmployees(businessId: string, limit = 5) {
  const supabase = await createSupabaseServerClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("tasks")
    .select("assigned_to")
    .eq("business_id", businessId)
    .eq("status", "completed")
    .gte("completed_at", sevenDaysAgo);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.assigned_to) continue;
    counts.set(row.assigned_to, (counts.get(row.assigned_to) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([userId, completed]) => ({ userId, completed }));
}

// Overworked: sum scheduled hours from active tasks (start_at → end_at) over the next 7 days.
// Rule:
//   If anyone > 40h  → flag ALL employees above 40h as overworked.
//   Else if anyone > 30h → flag ONLY the single highest one.
//   Else → no flag.
export async function overworkedEmployees(businessId: string) {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("assigned_to, start_at, end_at")
    .eq("business_id", businessId)
    .not("assigned_to", "is", null)
    .not("start_at",    "is", null)
    .not("end_at",      "is", null)
    .in("status", ["pending", "in_progress", "awaiting_acceptance"])
    .gte("end_at", now)
    .lte("start_at", sevenDaysFromNow);

  const hours = new Map<string, number>();
  for (const t of tasks ?? []) {
    if (!t.assigned_to || !t.start_at || !t.end_at) continue;
    const dur = (new Date(t.end_at).getTime() - new Date(t.start_at).getTime()) / 3_600_000;
    hours.set(t.assigned_to, (hours.get(t.assigned_to) ?? 0) + dur);
  }

  const sorted = [...hours.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([userId, hrs]) => ({ userId, hours: Math.round(hrs * 10) / 10 }));

  const above40 = sorted.filter((e) => e.hours > 40);
  if (above40.length > 0) return above40;

  const above30 = sorted.filter((e) => e.hours > 30);
  if (above30.length > 0) return [above30[0]];

  return [];
}

export async function progressForBusiness(businessId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ count: total }, { count: done }] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "completed"),
  ]);
  const t = total ?? 0;
  const d = done  ?? 0;
  return { total: t, completed: d, percent: t === 0 ? 0 : Math.round((d / t) * 100) };
}

export async function progressForUser(businessId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ count: t }, { count: d }] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("assigned_to", userId),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("assigned_to", userId).eq("status", "completed"),
  ]);
  const total = t ?? 0;
  const done  = d ?? 0;
  return { total, completed: done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}
