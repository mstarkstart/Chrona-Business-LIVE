"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import type { TaskStatus } from "@/lib/supabase/types";
import { sendTaskAssignmentEmail, sendTaskCompletionEmail } from "@/lib/email/send";
import { awardPointsForTask } from "@/lib/rewards/actions";

export async function createTask(formData: FormData) {
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  if (!can(active.role, "task.create")) throw new Error("Forbidden");

  const supabase = await createSupabaseServerClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: active.workspace.id,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "") || null,
      priority: "normal", // Forced default to Normal
      assigned_to: String(formData.get("assigned_to") ?? "") || null,
      due_date: String(formData.get("due_date") ?? "") || null,
      start_at: String(formData.get("start_at") ?? "") || null,
      requires_approval: formData.get("requires_approval") === "on",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createTask error:", error);
    throw new Error(error.message);
  }

  if (task) {
    await syncTaskCalendarEvent(task.id);
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function setTaskStatus(formData: FormData) {
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as "pending" | "in_progress" | "completed" | "cancelled" | "awaiting_approval" | "awaiting_acceptance";
  const patch: Record<string, unknown> = { status };
  if (status === "completed") patch.completed_at = new Date().toISOString();

  // Fetch task before update so we can check due_date and details for notification/email
  const { data: taskRow } = await supabase
    .from("tasks")
    .select("title, due_date, created_by")
    .eq("id", id)
    .eq("workspace_id", active.workspace.id)
    .maybeSingle();

  await supabase.from("tasks").update(patch).eq("id", id).eq("workspace_id", active.workspace.id);

  // Mirror activity status: starting a task → tasking, completing → available
  // Use supabaseAdmin so the BEFORE INSERT/UPDATE trigger on activity_status can
  // INSERT into activity_log (whose RLS has `with check (false)` for client rows).
  if (status === "in_progress") {
    await supabaseAdmin
      .from("activity_status")
      .upsert({ workspace_member_id: active.member.id, status: "tasking", task_id: id }, { onConflict: "workspace_member_id" });
  } else if (status === "completed") {
    await supabaseAdmin
      .from("activity_status")
      .upsert({ workspace_member_id: active.member.id, status: "available", task_id: null }, { onConflict: "workspace_member_id" });

    // Send task completion notification and email to task creator
    if (taskRow) {
      const userName = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(" ") || user.email || "Someone";
      if (taskRow.created_by && taskRow.created_by !== user.id) {
        // Create bell notification for creator
        await supabaseAdmin.from("notifications").insert({
          workspace_id: active.workspace.id,
          user_id: taskRow.created_by,
          type: "task_completion",
          title: `Task completed: ${taskRow.title}`,
          body: `${userName} has completed this task.`,
          task_id: id,
        });

        // Send task completion email
        try {
          const { data: creatorProfile } = await supabaseAdmin
            .from("profiles")
            .select("personal_email")
            .eq("id", taskRow.created_by)
            .maybeSingle();

          const creatorEmail = creatorProfile?.personal_email;
          if (creatorEmail) {
            await sendTaskCompletionEmail({
              to: creatorEmail,
              taskTitle: taskRow.title,
              completedByName: userName,
              workspaceName: active.workspace.name,
            });
          }
        } catch (e) {
          console.error("[email] sendTaskCompletionEmail failed:", e);
        }
      }
    }

    // Award points — fire-and-forget so a reward failure never breaks the task update
    const today = new Date().toISOString().split("T")[0];
    const wasEarlyCompletion = Boolean(taskRow?.due_date && taskRow.due_date > today);
    awardPointsForTask(id, active.workspace.id, user.id, wasEarlyCompletion).catch((e) =>
      console.error("[rewards] awardPointsForTask failed:", e),
    );
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/rewards");
}

export async function approveTask(formData: FormData) {
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  if (!can(active.role, "task.approve")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("tasks")
    .update({ status: "in_progress", approved_by: user.id })
    .eq("id", id)
    .eq("workspace_id", active.workspace.id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function rejectTask(formData: FormData) {
  const active = await requireActiveWorkspace();
  if (!can(active.role, "task.approve")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("tasks")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("workspace_id", active.workspace.id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function moveTask(taskId: string, newStatus: TaskStatus, newPosition: number) {
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  const validStatuses = ["pending", "in_progress", "completed", "cancelled", "awaiting_approval", "awaiting_acceptance"];
  if (!validStatuses.includes(newStatus)) throw new Error("Invalid status");

  const patch: Record<string, unknown> = {
    status: newStatus,
    position: newPosition,
  };
  if (newStatus === "completed") patch.completed_at = new Date().toISOString();

  await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId)
    .eq("workspace_id", active.workspace.id);

  revalidatePath("/projects");
  revalidatePath("/tasks");
}

export async function createTaskInProject(
  workspaceId: string,
  projectId: string | null | undefined,
  title: string,
  status: TaskStatus,
) {
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  if (!can(active.role, "task.create")) throw new Error("Forbidden");
  if (active.workspace.id !== workspaceId) throw new Error("Workspace mismatch");

  const supabase = await createSupabaseServerClient();

  // Compute next position in this column
  const actualProjectId = projectId || null;
  const query = supabase
    .from("tasks")
    .select("position")
    .eq("workspace_id", workspaceId)
    .eq("status", status);

  if (actualProjectId) {
    query.eq("project_id", actualProjectId);
  } else {
    query.is("project_id", null);
  }

  const { data: existing } = await query
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = (existing && existing.length > 0) ? ((existing[0].position ?? 0) + 1) : 0;

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      project_id: actualProjectId,
      title: title.trim(),
      status,
      priority: "normal",
      position: nextPosition,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/projects");
  if (actualProjectId) {
    revalidatePath(`/projects/${actualProjectId}`);
  }
  revalidatePath("/tasks");
  return task;
}


export async function assignTask(formData: FormData) {
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  if (!can(active.role, "task.assign")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const assignTo = String(formData.get("assigned_to")) || null;
  const supabase = await createSupabaseServerClient();

  // Fetch current task so we can decide status transition
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, status, assigned_to, priority, due_date")
    .eq("id", id)
    .eq("workspace_id", active.workspace.id)
    .maybeSingle();
  if (!task) return;

  const updates: Record<string, unknown> = { assigned_to: assignTo };

  if (assignTo && !task.assigned_to && task.status === "pending") {
    // New assignment on an unassigned pending task → require acceptance
    updates.status = "awaiting_acceptance";
  } else if (!assignTo && task.status === "awaiting_acceptance") {
    // Unassigning → revert to pending
    updates.status = "pending";
  }

  await supabase.from("tasks").update(updates).eq("id", id).eq("workspace_id", active.workspace.id);
  await syncTaskCalendarEvent(id);

  // Notify the newly assigned person
  if (assignTo && updates.status === "awaiting_acceptance") {
    await supabaseAdmin.from("notifications").insert({
      workspace_id: active.workspace.id,
      user_id: assignTo,
      type: "task_assignment",
      title: `You've been assigned: ${task.title}`,
      body: null,
      task_id: id,
    });

    // Send task assignment email — fire-and-forget (never throws).
    try {
      // Fetch the assignee's email and the assigner's display name in parallel.
      const [assigneeProfile, assignerProfile] = await Promise.all([
        supabaseAdmin.from("profiles").select("personal_email, first_name, last_name").eq("id", assignTo).maybeSingle(),
        supabaseAdmin.from("profiles").select("first_name, last_name").eq("id", user.id).maybeSingle(),
      ]);

      const assigneeEmail = assigneeProfile.data?.personal_email;
      if (assigneeEmail) {
        const assignerName =
          [assignerProfile.data?.first_name, assignerProfile.data?.last_name].filter(Boolean).join(" ") ||
          "A workspace manager";

        await sendTaskAssignmentEmail({
          to: assigneeEmail,
          taskTitle: task.title,
          taskId: id,
          assignerName,
          workspaceName: active.workspace.name,
          priority: task.priority ?? "normal",
          dueDate: task.due_date ?? null,
        });
      }
    } catch (e) {
      console.error("[email] sendTaskAssignmentEmail failed:", e);
    }
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

/**
 * Update the calling user's activity status.
 * Must use supabaseAdmin because the DB trigger inserts into activity_log,
 * which blocks direct client writes via `with check (false)`.
 */
export async function updateActivityStatus(formData: FormData) {
  const active = await requireActiveWorkspace();
  const status = String(formData.get("status")) as import("@/lib/supabase/types").ActivityStatus;
  const validStatuses = ["available", "tasking", "meeting", "lunch_break", "personal_time", "training", "offline"];
  if (!validStatuses.includes(status)) throw new Error("Invalid status");

  const { error } = await supabaseAdmin
    .from("activity_status")
    .upsert(
      { workspace_member_id: active.member.id, status, task_id: null },
      { onConflict: "workspace_member_id" }
    );

  if (error) {
    console.error("updateActivityStatus error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

export async function syncTaskCalendarEvent(taskId: string) {
  const { data: task, error: fetchErr } = await supabaseAdmin
    .from("tasks")
    .select("workspace_id, title, assigned_to, start_at, end_at, due_date")
    .eq("id", taskId)
    .maybeSingle();

  if (fetchErr || !task) {
    console.error("syncTaskCalendarEvent: failed to fetch task or task not found", taskId, fetchErr);
    return;
  }

  // Get existing events for this task
  const { data: existingEvents } = await supabaseAdmin
    .from("calendar_events")
    .select("id")
    .eq("task_id", taskId);

  // If the task is not assigned, delete any calendar events linked to it
  if (!task.assigned_to) {
    if (existingEvents && existingEvents.length > 0) {
      await supabaseAdmin
        .from("calendar_events")
        .delete()
        .eq("task_id", taskId);
      
      // Broadcast update
      supabaseAdmin.channel(`calendar:${task.workspace_id}`).send({
        type: "broadcast",
        event: "calendar_updated",
        payload: { action: "delete" }
      });
    }
    return;
  }

  // Determine start_at and end_at
  let startAt: string | null = null;
  let endAt: string | null = null;

  if (task.start_at && task.end_at) {
    startAt = task.start_at;
    endAt = task.end_at;
  } else if (task.start_at) {
    startAt = task.start_at;
    const d = new Date(task.start_at);
    d.setHours(d.getHours() + 1);
    endAt = d.toISOString();
  } else if (task.due_date) {
    endAt = task.due_date;
    const d = new Date(task.due_date);
    d.setHours(d.getHours() - 1);
    startAt = d.toISOString();
  }

  // If we don't have date/time info, delete the event
  if (!startAt || !endAt) {
    if (existingEvents && existingEvents.length > 0) {
      await supabaseAdmin
        .from("calendar_events")
        .delete()
        .eq("task_id", taskId);

      // Broadcast update
      supabaseAdmin.channel(`calendar:${task.workspace_id}`).send({
        type: "broadcast",
        event: "calendar_updated",
        payload: { action: "delete" }
      });
    }
    return;
  }

  // Upsert the event
  if (existingEvents && existingEvents.length > 0) {
    // Update the first event
    await supabaseAdmin
      .from("calendar_events")
      .update({
        owner_id: task.assigned_to,
        title: task.title,
        start_at: startAt,
        end_at: endAt,
        workspace_id: task.workspace_id,
      })
      .eq("id", existingEvents[0].id);

    // Broadcast update
    supabaseAdmin.channel(`calendar:${task.workspace_id}`).send({
      type: "broadcast",
      event: "calendar_updated",
      payload: { action: "update" }
    });

    // Delete duplicates if they somehow exist
    if (existingEvents.length > 1) {
      const toDelete = existingEvents.slice(1).map(e => e.id);
      await supabaseAdmin
        .from("calendar_events")
        .delete()
        .in("id", toDelete);
    }
  } else {
    // Insert new
    await supabaseAdmin
      .from("calendar_events")
      .insert({
        workspace_id: task.workspace_id,
        owner_id: task.assigned_to,
        title: task.title,
        event_type: "task_block",
        start_at: startAt,
        end_at: endAt,
        task_id: taskId,
        is_team: false,
      });

    // Broadcast update
    supabaseAdmin.channel(`calendar:${task.workspace_id}`).send({
      type: "broadcast",
      event: "calendar_updated",
      payload: { action: "insert" }
    });
  }
}

export async function syncTaskCalendarEventAction(taskId: string) {
  await syncTaskCalendarEvent(taskId);
}
