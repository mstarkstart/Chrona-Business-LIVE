import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role, Tables } from "@/lib/supabase/types";

const ACTIVE_BUSINESS_COOKIE = "chrona-active-business";

export type SessionUser = {
  id: string;
  email: string | null;
  profile: Tables<"profiles"> | null;
};

export type ActiveMembership = {
  business: Tables<"businesses">;
  member: Tables<"business_members">;
  role: Role;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { id: user.id, email: user.email ?? null, profile };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// All businesses the current user belongs to (status='active'). Used by switcher.
export async function listMyMemberships(): Promise<ActiveMembership[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("business_members")
    .select("*, business:businesses(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error || !data) return [];

  return data
    .filter((row): row is typeof row & { business: Tables<"businesses"> } => Boolean(row.business))
    .map((row) => ({
      business: row.business,
      member: row as Tables<"business_members">,
      role: row.role as Role,
    }));
}

export async function getActiveBusiness(): Promise<ActiveMembership | null> {
  const cookieStore = await cookies();
  const memberships = await listMyMemberships();
  if (memberships.length === 0) return null;

  const cookieValue = cookieStore.get(ACTIVE_BUSINESS_COOKIE)?.value;
  const chosen = memberships.find((m) => m.business.id === cookieValue) ?? memberships[0];

  // Pin the GUC for downstream RLS checks that read current_business_id().
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("set_active_business", { p_business_id: chosen.business.id });

  return chosen;
}

export async function requireActiveBusiness(): Promise<ActiveMembership> {
  const m = await getActiveBusiness();
  if (!m) redirect("/signup");
  return m;
}

export { ACTIVE_BUSINESS_COOKIE };
