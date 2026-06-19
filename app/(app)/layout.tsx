import { redirect } from "next/navigation";
import { requireUser, listMyMemberships, getActiveWorkspace } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SidebarA } from "@/components/shell/SidebarA";
import { SidebarB } from "@/components/shell/SidebarB";
import { Topbar } from "@/components/shell/Topbar";
import { MultiFunctionButton } from "@/components/shell/MultiFunctionButton";
import type { ActivityStatus, Tables } from "@/lib/supabase/types";

import { PageTransition } from "@/components/ui/PageTransition";
import { ThemeProvider } from "@/components/ThemeProvider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const memberships = await listMyMemberships();
  if (memberships.length === 0) redirect("/signup");

  const active = await getActiveWorkspace();
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
    supabase.from("approval_requests").select("id").eq("workspace_id", active.workspace.id).eq("status", "pending"),
    supabase.from("activity_status").select("status, updated_at").eq("workspace_member_id", active.member.id).maybeSingle(),
    supabase.from("tasks").select("id, title, status")
      .eq("workspace_id", active.workspace.id).eq("assigned_to", user.id)
      .gte("due_date", new Date(new Date().setHours(0,0,0,0)).toISOString())
      .lt("due_date",  new Date(new Date().setHours(24,0,0,0)).toISOString())
      .neq("status", "completed"),
    supabase.from("tasks").select("id, title").eq("workspace_id", active.workspace.id).eq("assigned_to", user.id).eq("status", "in_progress"),
    supabase.from("tasks").select("id, title").eq("workspace_id", active.workspace.id).is("assigned_to", null).eq("status", "pending").limit(3),
    supabase.from("activity_status")
      .select("workspace_member_id, status, updated_at, task_id, tasks(title), workspace_members!inner(workspace_id, user_id, status, profiles!workspace_members_user_id_profiles_fkey(first_name, last_name, avatar_url))")
      .eq("workspace_members.workspace_id", active.workspace.id)
      .eq("workspace_members.status", "active")
      .limit(50),
    supabase.from("workspace_members")
      .select("id, user_id, profiles!workspace_members_user_id_profiles_fkey(first_name, last_name)")
      .eq("workspace_id", active.workspace.id)
      .eq("status", "active"),
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
  ]);

  const initialPresence = (presence ?? []).map((p) => {
    const raw = p as unknown as { workspace_members?: { profiles?: { first_name?: string; last_name?: string; avatar_url?: string } }; tasks?: { title?: string } | null };
    const profile = raw.workspace_members?.profiles;
    return {
      workspace_member_id: p.workspace_member_id,
      user_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Member",
      avatar_url: profile?.avatar_url ?? null,
      status: p.status as ActivityStatus,
      updated_at: (p as any).updated_at ?? new Date().toISOString(),
      task_title: raw.tasks?.title ?? null,
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
    .eq("workspace_id", active.workspace.id)
    .maybeSingle();
  const mfbActions = Array.isArray(mfb?.actions) ? (mfb.actions as string[]) : [];

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <div className="flex h-screen bg-mesh text-foreground overflow-hidden relative theme-app">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-purple-500/10 blur-[100px] animate-blob delay-200" />
        <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] animate-blob delay-400" />
      </div>
      <SidebarA
        active={{ id: active.workspace.id, name: active.workspace.name, logoUrl: (active.workspace as any).logo_url ?? null }}
        options={memberships.map((m) => ({ id: m.workspace.id, name: m.workspace.name, logoUrl: (m.workspace as any).logo_url ?? null }))}
        pendingApprovals={approvals?.length ?? 0}
        userName={userName}
        avatarUrl={(user.profile as any)?.avatar_url}
        userRole={active.role}
        myStatus={(myStatusRow?.status ?? "available") as ActivityStatus}
        myMemberId={active.member.id}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Topbar
          userId={user.id}
          userName={userName}
          initialNotifications={(notifications ?? []) as Tables<"notifications">[]}
          workspaceId={active.workspace.id}
          workspaceName={active.workspace.name}
          avatarUrl={(user.profile as any)?.avatar_url}
        />
        <div className="flex-1 overflow-y-auto relative pb-16">
          <PageTransition>{children}</PageTransition>
        </div>
        <MultiFunctionButton actions={mfbActions} workspaceId={active.workspace.id} />
      </main>

      <SidebarB
        businessId={active.workspace.id}
        myMemberId={active.member.id}
        myStatus={(myStatusRow?.status ?? "available") as ActivityStatus}
        myStatusUpdatedAt={(myStatusRow as any)?.updated_at ?? null}
        myTasksToday={tasksToday ?? []}
        suggestedTasks={suggested ?? []}
        inProgressTasks={inProgress ?? []}
        initialPresence={initialPresence}
        members={members}
        avatarUrl={(user.profile as any)?.avatar_url ?? null}
        userName={userName}
      />
    </div>
    </ThemeProvider>
  );
}
