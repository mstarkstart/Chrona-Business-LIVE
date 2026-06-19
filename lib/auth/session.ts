import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role, Tables } from "@/lib/supabase/types";

import { cache } from "react";

const ACTIVE_WORKSPACE_COOKIE = "chrona-active-workspace";

export type SessionUser = {
  id: string;
  email: string | null;
  profile: Tables<"profiles"> | null;
};

export type ActiveMembership = {
  workspace: Tables<"workspaces">;
  member: Tables<"workspace_members">;
  role: Role;
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { id: user.id, email: user.email ?? null, profile };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// All workspaces the current user belongs to (status='active'). Used by switcher.
export const listMyMemberships = cache(async (): Promise<ActiveMembership[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*, workspace:workspaces(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error || !data) return [];

  return data
    .filter((row): row is typeof row & { workspace: Tables<"workspaces"> } => Boolean(row.workspace))
    .map((row) => ({
      workspace: row.workspace,
      member: row as Tables<"workspace_members">,
      role: row.role as Role,
    }));
});

export const getActiveWorkspace = cache(async (): Promise<ActiveMembership | null> => {
  const cookieStore = await cookies();
  const memberships = await listMyMemberships();
  if (memberships.length === 0) return null;

  const cookieValue = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const chosen = memberships.find((m) => m.workspace.id === cookieValue) ?? memberships[0];

  // Pin the GUC for downstream RLS checks that read current_workspace_id().
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("set_active_workspace", { p_workspace_id: chosen.workspace.id });

  return chosen;
});

export async function requireActiveWorkspace(): Promise<ActiveMembership> {
  const m = await getActiveWorkspace();
  if (!m) redirect("/signup");
  return m;
}

export { ACTIVE_WORKSPACE_COOKIE };

