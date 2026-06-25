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
      date: string;           // YYYY-MM-DD
      start_time?: string;    // HH:MM
      end_time?: string;      // HH:MM
      event_type?: string;
      is_team?: boolean;
      description?: string | null;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!body.date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const startTime = body.start_time || "09:00";
    let endTime = body.end_time || "10:00";

    // Ensure end > start
    if (startTime >= endTime) {
      const [h, m] = startTime.split(":").map(Number);
      endTime = `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    const VALID_TYPES = ["meeting", "task_block", "break", "lunch", "training", "focus", "other"];
    const eventType = VALID_TYPES.includes(body.event_type ?? "") ? body.event_type : "meeting";

    const { data: event, error } = await supabase
      .from("calendar_events")
      .insert({
        workspace_id: active.workspace.id,
        owner_id: user.id,
        title: body.title.trim(),
        event_type: eventType as any,
        start_at: `${body.date}T${startTime}:00`,
        end_at: `${body.date}T${endTime}:00`,
        is_team: body.is_team ?? false,
        description: body.description ?? null,
      } as any)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/calendar");

    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
