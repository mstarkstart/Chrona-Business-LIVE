import { redirect } from "next/navigation";
import { requireUser, listMyMemberships, getActiveBusiness } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SidebarA } from "@/components/shell/SidebarA";
import { SidebarB } from "@/components/shell/SidebarB";
import { MultiFunctionButton } from "@/components/shell/MultiFunctionButton";
import type { ActivityStatus } from "@/lib/supabase/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const memberships = await listMyMemberships();
  if (memberships.length === 0) redirect("/signup");

  const active = await getActiveBusiness();
  if (!active) redirect("/signup");

  const supabase = await createSupabaseServerClient();

  // Pending approvals visible to current user.
  const { data: approvals } = await supabase
    .from("approval_requests")
    .select("id")
    .eq("business_id", active.business.id)
    .eq("status", "pending");

  // Sidebar B context: my status, my tasks today, suggested, in progress, presence.
  const { data: myStatusRow } = await supabase
    .from("activity_status")
    .select("status")
    .eq("business_member_id", active.member.id)
    .maybeSingle();

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data: tasksToday } = await supabase
    .from("tasks")
    .select("id, title, status")
    .eq("business_id", active.business.id)
    .eq("assigned_to", user.id)
    .gte("due_date", startOfDay)
    .lt("due_date", endOfDay)
    .neq("status", "completed");

  const { data: inProgress } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("business_id", active.business.id)
    .eq("assigned_to", user.id)
    .eq("status", "in_progress");

  const { data: suggested } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("business_id", active.business.id)
    .is("assigned_to", null)
    .eq("status", "pending")
    .limit(3);

  const { data: presence } = await supabase
    .from("activity_status")
    .select("business_member_id, status, business_members!inner(business_id, user_id, profiles!business_members_user_id_profiles_fkey(first_name, last_name))")
    .eq("business_members.business_id", active.business.id)
    .limit(50);

  const initialPresence = (presence ?? []).map((p) => {
    const member = (p as unknown as { business_members?: { profiles?: { first_name?: string; last_name?: string } } }).business_members;
    const profile = member?.profiles;
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Member";
    return {
      business_member_id: p.business_member_id,
      user_name: name,
      status: p.status as ActivityStatus,
    };
  });

  // Multi-function button actions.
  const { data: mfb } = await supabase
    .from("multi_function_button_config")
    .select("actions")
    .eq("user_id", user.id)
    .eq("business_id", active.business.id)
    .maybeSingle();
  const mfbActions = Array.isArray(mfb?.actions) ? (mfb.actions as string[]) : [];

  const userName = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(" ") || (user.email ?? "");

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <SidebarA
        active={{ id: active.business.id, name: active.business.name }}
        options={memberships.map((m) => ({ id: m.business.id, name: m.business.name }))}
        pendingApprovals={approvals?.length ?? 0}
        userName={userName}
      />
      <main className="flex-1 overflow-y-auto relative">
        <MultiFunctionButton actions={mfbActions} />
        {children}
      </main>
      <SidebarB
        businessId={active.business.id}
        myMemberId={active.member.id}
        myStatus={(myStatusRow?.status ?? "available") as ActivityStatus}
        myTasksToday={tasksToday ?? []}
        suggestedTasks={suggested ?? []}
        inProgressTasks={inProgress ?? []}
        initialPresence={initialPresence}
      />
    </div>
  );
}
