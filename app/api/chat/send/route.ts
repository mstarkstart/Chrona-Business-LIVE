import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, getActiveWorkspace } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const active = await getActiveWorkspace();
    if (!active) return NextResponse.json({ error: "No active workspace" }, { status: 403 });

    const { body, workspaceId } = await request.json() as { body?: string; workspaceId?: string };

    if (!body?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });
    if (workspaceId !== active.workspace.id)
      return NextResponse.json({ error: "Workspace mismatch" }, { status: 403 });

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ workspace_id: active.workspace.id, user_id: user.id, body: body.trim() })
      .select("id")
      .single();

    if (error) {
      console.error("Chat send error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id: data.id });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
