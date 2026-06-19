import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { url } = await request.json();
  if (!url) return NextResponse.json({ ok: false }, { status: 400 });

  await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}
