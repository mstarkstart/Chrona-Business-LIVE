"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
    end_at: String(formData.get("end_at") ?? "") || null,
    requires_approval: formData.get("requires_approval") === "on",
    created_by: user.id,
  });
  revalidatePath("/tasks");
}

export async function setTaskStatus(formData: FormData) {
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as "pending" | "in_progress" | "completed" | "cancelled" | "awaiting_approval";
  const patch: Record<string, unknown> = { status };
  if (status === "completed") patch.completed_at = new Date().toISOString();
  await supabase.from("tasks").update(patch).eq("id", id).eq("business_id", active.business.id);
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
}

export async function assignTask(formData: FormData) {
  const active = await requireActiveBusiness();
  if (!can(active.role, "task.assign")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const assignTo = String(formData.get("assigned_to")) || null;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("tasks")
    .update({ assigned_to: assignTo })
    .eq("id", id)
    .eq("business_id", active.business.id);
  revalidatePath("/tasks");
}
