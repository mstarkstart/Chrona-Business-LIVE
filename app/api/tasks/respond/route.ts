// Employee accepts or declines an assigned task.
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { syncTaskCalendarEvent } from "@/lib/tasks/mutations";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { taskId, decision, notificationId } = await request.json();
  if (!taskId || !decision) return NextResponse.json({ ok: false }, { status: 400 });

  // Verify the task is actually assigned to this user
  const { data: task } = await supabaseAdmin
    .from("tasks")
    .select("id, workspace_id, title, created_by, status, assigned_to")
    .eq("id", taskId)
    .maybeSingle();

  if (!task || task.assigned_to !== user.id) {
    return NextResponse.json({ ok: false, error: "Not authorised" }, { status: 403 });
  }
  if (task.status !== "awaiting_acceptance") {
    return NextResponse.json({ ok: false, error: "Task not pending acceptance" }, { status: 400 });
  }

  if (decision === "accept") {
    await supabaseAdmin.from("tasks").update({ status: "pending" }).eq("id", taskId);

    // Notify the assigner
    await supabaseAdmin.from("notifications").insert({
      workspace_id: task.workspace_id,
      user_id: task.created_by,
      type: "task_accepted",
      title: `Task accepted: ${task.title}`,
      body: null,
      task_id: taskId,
    });
  } else {
    // Decline — remove assignee, back to unassigned pending
    await supabaseAdmin
      .from("tasks")
      .update({ status: "pending", assigned_to: null })
      .eq("id", taskId);

    await supabaseAdmin.from("notifications").insert({
      workspace_id: task.workspace_id,
      user_id: task.created_by,
      type: "task_declined",
      title: `Task declined: ${task.title}`,
      body: null,
      task_id: taskId,
    });
  }

  // Synchronize the task's calendar event
  await syncTaskCalendarEvent(taskId);

  // Mark notification read
  if (notificationId) {
    await supabaseAdmin
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);
  }

  return NextResponse.json({ ok: true });
}
