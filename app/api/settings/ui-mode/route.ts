import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json();
  const mode = body.ui_mode;
  if (mode !== "simple" && mode !== "advanced") {
    return NextResponse.json({ ok: false, error: "Invalid ui_mode" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ ui_mode: mode })
    .eq("id", user.id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
