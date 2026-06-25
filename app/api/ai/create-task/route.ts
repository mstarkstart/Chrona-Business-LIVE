import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveWorkspace, requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const active = await requireActiveWorkspace();
    const supabase = await createSupabaseServerClient();

    const body = await request.json() as {
      title: string;
      description?: string | null;
      priority?: string;
      due_date?: string | null;
      assignee_name?: string | null;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let assigned_to: string | null = null;
    let status: "pending" | "awaiting_acceptance" = "pending";

    // Resolve assignee name to user ID if provided
    if (body.assignee_name?.trim()) {
      const nameQuery = body.assignee_name.trim().toLowerCase();
      
      const { data: members } = await supabase
        .from("workspace_members")
        .select("user_id, profiles!workspace_members_user_id_profiles_fkey(first_name, last_name, preferred_name)")
        .eq("workspace_id", active.workspace.id)
        .eq("status", "active");

      if (members) {
        const matchedMember = members.find((m) => {
          const p = (m as any).profiles;
          if (!p) return false;
          const firstName = (p.first_name || "").toLowerCase();
          const lastName = (p.last_name || "").toLowerCase();
          const preferredName = (p.preferred_name || "").toLowerCase();
          const fullName = `${firstName} ${lastName}`.trim();
          
          return (
            firstName === nameQuery ||
            lastName === nameQuery ||
            preferredName === nameQuery ||
            fullName === nameQuery ||
            fullName.includes(nameQuery) ||
            nameQuery.includes(firstName)
          );
        });

        if (matchedMember) {
          assigned_to = matchedMember.user_id;
          // If assigned to a different user, status must be awaiting_acceptance
          if (assigned_to !== user.id) {
            status = "awaiting_acceptance";
          }
        }
      }
    }

    // Insert task
    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        workspace_id: active.workspace.id,
        title: body.title.trim(),
        description: body.description ?? null,
        priority: (["low","normal","high","urgent"].includes(body.priority ?? "") ? body.priority : "normal") as "low" | "normal" | "high" | "urgent",
        due_date: body.due_date ?? null,
        status,
        assigned_to,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send real-time notification if task is awaiting acceptance
    if (status === "awaiting_acceptance" && assigned_to) {
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

      const creatorName = creatorProfile
        ? `${creatorProfile.first_name || ""} ${creatorProfile.last_name || ""}`.trim()
        : "a teammate";

      await supabase.from("notifications").insert({
        workspace_id: active.workspace.id,
        user_id: assigned_to,
        type: "task_assignment",
        title: `You've been assigned: ${body.title.trim()}`,
        body: `Assigned by Chrona Nexus on behalf of ${creatorName}`,
        task_id: task.id,
      });
    }

    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    revalidatePath("/inbox");

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
