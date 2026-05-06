"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser, requireActiveBusiness } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";

export async function createTask(formData: FormData) {
  const user = await requireUser();
  const active = await requireActiveBusiness();
  if (!can(active.role, "task.create")) throw new Error("Forbidden");

  const supabase = await createSupabaseServerClient();
  await supabase.from("tasks").insert({
    business_id: active.business.id,
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "") || null,
    priority: (String(formData.get("priority") ?? "normal") as "low" | "normal" | "high" | "urgent"),
    assigned_to: String(formData.get("assigned_to") ?? "") || null,
    due_date: String(formData.get("due_date") ?? "") || null,
    start_at: String(formData.get("start_at") ?? "") || null,
    requires_approval: formData.get("requires_approval") === "on",
    created_by: user.id,
  });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function setTaskStatus(formData: FormData) {
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as "pending" | "in_progress" | "completed" | "cancelled" | "awaiting_approval" | "awaiting_acceptance";
  const patch: Record<string, unknown> = { status };
  if (status === "completed") patch.completed_at = new Date().toISOString();
  await supabase.from("tasks").update(patch).eq("id", id).eq("business_id", active.business.id);

  // Mirror activity status: starting a task → tasking, completing → available
  if (status === "in_progress") {
    await supabase
      .from("activity_status")
      .upsert({ business_member_id: active.member.id, status: "tasking" }, { onConflict: "business_member_id" });
  } else if (status === "completed") {
    await supabase
      .from("activity_status")
      .upsert({ business_member_id: active.member.id, status: "available" }, { onConflict: "business_member_id" });
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function approveTask(formData: FormData) {
  const user = await requireUser();
  const active = await requireActiveBusiness();
  if (!can(active.role, "task.approve")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("tasks")
    .update({ status: "in_progress", approved_by: user.id })
    .eq("id", id)
    .eq("business_id", active.business.id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function rejectTask(formData: FormData) {
  const active = await requireActiveBusiness();
  if (!can(active.role, "task.approve")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("tasks")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("business_id", active.business.id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function assignTask(formData: FormData) {
  const active = await requireActiveBusiness();
  if (!can(active.role, "task.assign")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const assignTo = String(formData.get("assigned_to")) || null;
  const supabase = await createSupabaseServerClient();

  // Fetch current task so we can decide status transition
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, status, assigned_to")
    .eq("id", id)
    .eq("business_id", active.business.id)
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

  await supabase.from("tasks").update(updates).eq("id", id).eq("business_id", active.business.id);

  // Notify the newly assigned person
  if (assignTo && updates.status === "awaiting_acceptance") {
    await supabaseAdmin.from("notifications").insert({
      business_id: active.business.id,
      user_id: assignTo,
      type: "task_assignment",
      title: `You've been assigned: ${task.title}`,
      body: null,
      task_id: id,
    });
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
