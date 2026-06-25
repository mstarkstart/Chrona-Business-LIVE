"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import { syncTaskCalendarEvent } from "@/lib/tasks/mutations";

export async function respondToTaskAction(taskId: string, notificationId: string | null, decision: "accept" | "decline") {
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, workspace_id, title, created_by, status, assigned_to")
    .eq("id", taskId)
    .eq("workspace_id", active.workspace.id)
    .maybeSingle();

  if (!task || task.assigned_to !== user.id) throw new Error("Not authorised");
  if (task.status !== "awaiting_acceptance") throw new Error("Invalid task status");

  if (decision === "accept") {
    await supabaseAdmin.from("tasks").update({ status: "pending" }).eq("id", taskId);

    await supabaseAdmin.from("notifications").insert({
      workspace_id: task.workspace_id,
      user_id: task.created_by,
      type: "task_accepted",
      title: `Task accepted: ${task.title}`,
      body: null,
      task_id: taskId,
    });
  } else {
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

  await syncTaskCalendarEvent(taskId);

  let notifQuery = supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() });

  if (notificationId) {
    notifQuery = notifQuery.eq("id", notificationId);
  } else {
    notifQuery = notifQuery
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .eq("type", "task_assignment")
      .is("read_at", null);
  }

  await notifQuery;

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/inbox");
}
