import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const active = await requireActiveWorkspace();
    const body = await req.json();
    const { id, start_at, end_at, title, event_type, description } = body;

    if (!id || !start_at || !end_at) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Verify ownership — user can only update their own events
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("id, owner_id, workspace_id, title, event_type")
      .eq("id", id)
      .eq("workspace_id", active.workspace.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
    }
    if (existing.owner_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const updates: Record<string, unknown> = { start_at, end_at };
    if (title !== undefined) updates.title = title;
    if (event_type !== undefined) updates.event_type = event_type;
    if (description !== undefined) updates.description = description;

    const { error } = await supabase
      .from("calendar_events")
      .update(updates)
      .eq("id", id)
      .eq("owner_id", user.id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Broadcast realtime so other clients update instantly
    supabaseAdmin.channel(`calendar:${active.workspace.id}`).send({
      type: "broadcast",
      event: "calendar_updated",
      payload: { action: "update", id },
    });

    revalidatePath("/calendar");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
