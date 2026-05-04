import { ROLE_RANK, isAtOrAbove } from "./roles";
import type { Role } from "@/lib/supabase/types";

export type Action =
  | "business.update" | "business.delete"
  | "department.create" | "department.update" | "department.delete"
  | "team.create" | "team.update" | "team.delete"
  | "member.add" | "member.remove" | "member.update_role"
  | "task.create" | "task.assign" | "task.approve" | "task.complete" | "task.delete"
  | "calendar.write_others"
  | "approval.decide"
  | "multi_function_button.customise";

export type Scope = "self" | "team" | "department" | "company";

const MIN_ROLE: Record<Action, Role> = {
  "business.update":              "employer",
  "business.delete":              "employer",
  "department.create":            "manager",
  "department.update":            "manager",
  "department.delete":            "c_suite",
  "team.create":                  "manager",
  "team.update":                  "team_lead",
  "team.delete":                  "manager",
  "member.add":                   "c_suite",
  "member.remove":                "c_suite",
  "member.update_role":           "c_suite",
  "task.create":                  "employee",
  "task.assign":                  "team_lead",
  "task.approve":                 "team_lead",
  "task.complete":                "employee",
  "task.delete":                  "team_lead",
  "calendar.write_others":        "team_lead",
  "approval.decide":              "employer",
  "multi_function_button.customise": "employee",
};

// Single source of truth for UI hide-buttons + server-action gates.
// RLS is the third layer of defence — never the only one.
export function can(role: Role, action: Action, _scope: Scope = "self"): boolean {
  return isAtOrAbove(role, MIN_ROLE[action]);
}

export { ROLE_RANK, isAtOrAbove };
