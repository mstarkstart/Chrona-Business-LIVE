import { redirect } from "next/navigation";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TimesheetsClient } from "@/components/timesheets/TimesheetsClient";
import { TimesheetRealtimeSync } from "@/components/timesheets/TimesheetRealtimeSync";
import type { Role } from "@/lib/supabase/types";

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>;
}) {
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;

  const isManager = ["owner", "admin", "manager"].includes(active.role);

  // 1. Fetch active workspace members
  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select(`
      id,
      user_id,
      role,
      position,
      profiles!workspace_members_user_id_profiles_fkey (
        first_name,
        last_name,
        personal_email,
        avatar_url
      )
    `)
    .eq("workspace_id", active.workspace.id)
    .eq("status", "active");

  const membersList = (memberRows ?? []).map((m) => {
    const p = m.profiles as unknown as { first_name?: string; last_name?: string; personal_email?: string; avatar_url?: string } | null;
    return {
      id: m.id,
      name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.personal_email || "Member",
      role: m.role,
      position: m.position,
      avatar_url: p?.avatar_url ?? null,
    };
  });

  // Determine which member timesheet to load
  let targetMemberId = active.member.id;
  if (isManager && params.memberId) {
    const exists = membersList.some((m) => m.id === params.memberId);
    if (exists) {
      targetMemberId = params.memberId;
    }
  }

  // 2. Query activity logs of the selected member
  const { data: logs } = await supabase
    .from("activity_log")
    .select("id, status, started_at, ended_at, task_id, tasks(title)")
    .eq("workspace_id", active.workspace.id)
    .eq("workspace_member_id", targetMemberId)
    .order("started_at", { ascending: false })
    .limit(50) as any;

  const transformedLogs = (logs ?? []).map((l: any) => ({
    id: l.id,
    status: l.status,
    started_at: l.started_at,
    ended_at: l.ended_at,
    task_title: l.tasks ? (l.tasks as unknown as { title: string }).title : null,
  }));

  // 3. Compute team weekly hour summaries if manager
  let teamSummaries: {
    memberId: string;
    name: string;
    position: string | null;
    role: string;
    avatarUrl: string | null;
    totalHours: number;
  }[] = [];

  if (isManager) {
    const now = new Date();
    // Monday of current week
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const { data: allLogs } = await supabase
      .from("activity_log")
      .select("workspace_member_id, started_at, ended_at")
      .eq("workspace_id", active.workspace.id)
      .gte("started_at", startOfWeek.toISOString());

    const hoursMap = new Map<string, number>();
    (allLogs ?? []).forEach((log) => {
      const start = new Date(log.started_at);
      const end = log.ended_at ? new Date(log.ended_at) : new Date();
      const duration = end.getTime() - start.getTime();
      if (duration > 0) {
        const hours = duration / (1000 * 60 * 60);
        hoursMap.set(log.workspace_member_id, (hoursMap.get(log.workspace_member_id) ?? 0) + hours);
      }
    });

    teamSummaries = membersList.map((m) => ({
      memberId: m.id,
      name: m.name,
      role: m.role,
      position: m.position,
      avatarUrl: m.avatar_url,
      totalHours: hoursMap.get(m.id) ?? 0,
    }));
  }

  return (
    <>
      <TimesheetRealtimeSync workspaceId={active.workspace.id} />
      <TimesheetsClient
        members={membersList}
        myMemberId={active.member.id}
        isManager={isManager}
        initialMemberLogs={transformedLogs}
        initialMemberId={targetMemberId}
        teamSummaries={teamSummaries}
      />
    </>
  );
}
