import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActiveWorkspace } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import type { NotificationType } from "@/lib/supabase/types";

const PUBLIC_NOTIFICATION_TYPES = new Set<NotificationType>(["task_assignment"]);

function isPublicNotificationType(type: string | undefined): type is NotificationType {
  return !!type && PUBLIC_NOTIFICATION_TYPES.has(type as NotificationType);
}

type CreateNotificationBody = {
  userId?: string;
  businessId?: string;
  workspaceId?: string;
  type?: string;
  title?: string;
  body?: string | null;
  taskId?: string | null;
};

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const active = await getActiveWorkspace();
  if (!active) return NextResponse.json({ ok: false, error: "No active workspace" }, { status: 403 });

  let payload: CreateNotificationBody;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const workspaceId = payload.workspaceId ?? payload.businessId;
  const title = payload.title?.trim();

  if (workspaceId !== active.workspace.id) {
    return NextResponse.json({ ok: false, error: "Workspace mismatch" }, { status: 403 });
  }
  if (!payload.userId || !payload.type || !title) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  if (!isPublicNotificationType(payload.type)) {
    return NextResponse.json({ ok: false, error: "Unsupported notification type" }, { status: 400 });
  }
  const notificationType = payload.type;

  const { data: targetMember } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", active.workspace.id)
    .eq("user_id", payload.userId)
    .eq("status", "active")
    .maybeSingle();

  if (!targetMember) {
    return NextResponse.json({ ok: false, error: "Recipient is not in this workspace" }, { status: 403 });
  }

  let taskId: string | null = null;
  if (notificationType === "task_assignment") {
    if (!payload.taskId) {
      return NextResponse.json({ ok: false, error: "taskId is required" }, { status: 400 });
    }

    const { data: task } = await supabase
      .from("tasks")
      .select("id, assigned_to, created_by, status")
      .eq("workspace_id", active.workspace.id)
      .eq("id", payload.taskId)
      .maybeSingle();

    if (!task || task.assigned_to !== payload.userId || task.status !== "awaiting_acceptance") {
      return NextResponse.json({ ok: false, error: "Invalid task assignment" }, { status: 403 });
    }
    if (task.created_by !== user.id && !can(active.role, "task.assign")) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    taskId = task.id;
  }

  const { error } = await supabaseAdmin.from("notifications").insert({
    workspace_id: active.workspace.id,
    user_id: payload.userId,
    type: notificationType,
    title: title.slice(0, 200),
    body: payload.body?.slice(0, 1000) ?? null,
    task_id: taskId,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}