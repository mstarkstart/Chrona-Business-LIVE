import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// All heuristics are intentionally simple — v1 does not use ML.

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

export async function overworkedEmployees(businessId: string, limit = 5) {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("calendar_events")
    .select("owner_id, start_at, end_at")
    .eq("business_id", businessId)
    .gte("start_at", now)
    .lte("end_at", sevenDaysFromNow);

  const minutes = new Map<string, number>();
  for (const e of data ?? []) {
    const dur = (new Date(e.end_at).getTime() - new Date(e.start_at).getTime()) / 60000;
    minutes.set(e.owner_id, (minutes.get(e.owner_id) ?? 0) + dur);
  }
  return [...minutes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([userId, mins]) => ({ userId, hours: Math.round((mins / 60) * 10) / 10 }));
}

export async function progressForBusiness(businessId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: total } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);
  const { count: totalCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);
  const { count: doneCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "completed");
  void total;
  const t = totalCount ?? 0;
  const d = doneCount ?? 0;
  return { total: t, completed: d, percent: t === 0 ? 0 : Math.round((d / t) * 100) };
}

export async function progressForUser(businessId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { count: t } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("assigned_to", userId);
  const { count: d } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("assigned_to", userId)
    .eq("status", "completed");
  const total = t ?? 0;
  const done = d ?? 0;
  return { total, completed: done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}
