import { redirect } from "next/navigation";
import { requireUser, listMyMemberships, getActiveBusiness } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SidebarA } from "@/components/shell/SidebarA";
import { SidebarB } from "@/components/shell/SidebarB";
import { NotificationBell } from "@/components/shell/NotificationBell";
import { MultiFunctionButton } from "@/components/shell/MultiFunctionButton";
import type { ActivityStatus, Tables } from "@/lib/supabase/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const memberships = await listMyMemberships();
  if (memberships.length === 0) redirect("/signup");

  const active = await getActiveBusiness();
  if (!active) redirect("/signup");

  const supabase = await createSupabaseServerClient();

  const [
    { data: approvals },
    { data: myStatusRow },
    { data: tasksToday },
    { data: inProgress },
    { data: suggested },
    { data: presence },
    { data: memberRows },
    { data: notifications },
  ] = await Promise.all([
    supabase.from("approval_requests").select("id").eq("business_id", active.business.id).eq("status", "pending"),
    supabase.from("activity_status").select("status").eq("business_member_id", active.member.id).maybeSingle(),
    supabase.from("tasks").select("id, title, status")
      .eq("business_id", active.business.id).eq("assigned_to", user.id)
      .gte("due_date", new Date(new Date().setHours(0,0,0,0)).toISOString())
      .lt("due_date",  new Date(new Date().setHours(24,0,0,0)).toISOString())
      .neq("status", "completed"),
    supabase.from("tasks").select("id, title").eq("business_id", active.business.id).eq("assigned_to", user.id).eq("status", "in_progress"),
    supabase.from("tasks").select("id, title").eq("business_id", active.business.id).is("assigned_to", null).eq("status", "pending").limit(3),
    supabase.from("activity_status")
      .select("business_member_id, status, business_members!inner(business_id, user_id, profiles!business_members_user_id_profiles_fkey(first_name, last_name))")
      .eq("business_members.business_id", active.business.id)
      .limit(50),
    supabase.from("business_members")
      .select("id, user_id, profiles!business_members_user_id_profiles_fkey(first_name, last_name)")
      .eq("business_id", active.business.id)
      .eq("status", "active"),
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
  ]);

  const initialPresence = (presence ?? []).map((p) => {
    const member = (p as unknown as { business_members?: { profiles?: { first_name?: string; last_name?: string } } }).business_members;
    const profile = member?.profiles;
    return {
      business_member_id: p.business_member_id,
      user_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Member",
      status: p.status as ActivityStatus,
    };
  });

  const members = (memberRows ?? []).map((m) => {
    const p = (m as unknown as { profiles?: { first_name?: string; last_name?: string } }).profiles;
    return {
      id: m.id,
      userId: m.user_id,
      name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Member",
    };
  });

  const userName = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(" ") || (user.email ?? "");

  const { data: mfb } = await supabase
    .from("multi_function_button_config")
    .select("actions")
    .eq("user_id", user.id)
    .eq("business_id", active.business.id)
    .maybeSingle();
  const mfbActions = Array.isArray(mfb?.actions) ? (mfb.actions as string[]) : [];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">
      <SidebarA
        active={{ id: active.business.id, name: active.business.name }}
        options={memberships.map((m) => ({ id: m.business.id, name: m.business.name }))}
        pendingApprovals={approvals?.length ?? 0}
        userName={userName}
      />

      <main className="flex-1 overflow-y-auto">
        {/* Topbar: notification bell only (+ button is the floating FAB) */}
        <div className="sticky top-0 z-30 flex justify-end items-center px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm">
          <NotificationBell
            userId={user.id}
            initial={(notifications ?? []) as Tables<"notifications">[]}
          />
        </div>
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
        members={members}
      />
    </div>
  );
}
