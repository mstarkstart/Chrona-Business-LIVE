import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_BUSINESS_COOKIE } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const { businessId } = await request.json();
  if (!businessId) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  // Verify membership before pinning the cookie.
  const { data: membership } = await supabase
    .from("business_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("business_id", businessId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) return NextResponse.json({ ok: false }, { status: 403 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
