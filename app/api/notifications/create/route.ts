import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { userId, businessId, type, title, body, taskId } = await request.json();

  await supabaseAdmin.from("notifications").insert({
    workspace_id: businessId,
    user_id: userId,
    type,
    title,
    body: body ?? null,
    task_id: taskId ?? null,
  });

  return NextResponse.json({ ok: true });
}
