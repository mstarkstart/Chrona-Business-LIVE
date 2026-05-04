import type { Role } from "@/lib/supabase/types";

export const ROLE_RANK: Record<Role, number> = {
  employer: 5,
  c_suite: 4,
  manager: 3,
  team_lead: 2,
  employee: 1,
};

export const ROLE_LABEL: Record<Role, string> = {
  employer: "Employer",
  c_suite: "C-Suite",
  manager: "Manager",
  team_lead: "Team Lead",
  employee: "Employee",
};

export function isAtOrAbove(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
