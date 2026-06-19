import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Heuristic suggestion: assignee with the fewest open tasks in the same business.
export async function recommendAssignee(businessId: string): Promise<{ userId: string; name: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, profiles!workspace_members_user_id_profiles_fkey(first_name, last_name)")
    .eq("workspace_id", businessId)
    .eq("status", "active");
  if (!members || members.length === 0) return null;

  const { data: openTasks } = await supabase
    .from("tasks")
    .select("assigned_to")
    .eq("workspace_id", businessId)
    .neq("status", "completed")
    .neq("status", "cancelled");

  const load = new Map<string, number>();
  for (const t of openTasks ?? []) {
    if (t.assigned_to) load.set(t.assigned_to, (load.get(t.assigned_to) ?? 0) + 1);
  }

  let best: { userId: string; name: string } | null = null;
  let bestLoad = Infinity;
  for (const m of members) {
    const l = load.get(m.user_id) ?? 0;
    if (l < bestLoad) {
      bestLoad = l;
      const p = (m as unknown as { profiles?: { first_name?: string; last_name?: string } }).profiles;
      best = {
        userId: m.user_id,
        name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Member",
      };
    }
  }
  return best;
}
