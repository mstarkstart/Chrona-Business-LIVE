import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const active = await getActiveWorkspace();
  if (!active) {
    return NextResponse.json({ error: "No active workspace session" }, { status: 403 });
  }

  // Authorize: Only managers, admins, and owners can query other members' logs
  const isManager = ["owner", "admin", "manager"].includes(active.role);
  if (!isManager && active.member.id !== memberId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { data: logs, error } = await supabase
      .from("activity_log")
      .select("id, status, started_at, ended_at, task_id, tasks(title)")
      .eq("workspace_id", active.workspace.id)
      .eq("workspace_member_id", memberId)
      .order("started_at", { ascending: false })
      .limit(50) as any;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const transformedLogs = (logs ?? []).map((l: any) => ({
      id: l.id,
      status: l.status,
      started_at: l.started_at,
      ended_at: l.ended_at,
      task_title: l.tasks ? (l.tasks as unknown as { title: string }).title : null,
    }));

    return NextResponse.json({ logs: transformedLogs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
