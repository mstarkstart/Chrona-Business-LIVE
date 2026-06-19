import { ROLE_RANK, isAtOrAbove } from "./roles";
import type { Role } from "@/lib/supabase/types";

export type Action =
  | "workspace.update" | "workspace.delete"
  | "department.create" | "department.update" | "department.delete"
  | "team.create" | "team.update" | "team.delete"
  | "member.add" | "member.remove" | "member.update_role"
  | "project.create" | "project.update" | "project.delete"
  | "task.create" | "task.assign" | "task.approve" | "task.complete" | "task.delete"
  | "task.comment" | "task.prioritize"
  | "calendar.write_others"
  | "approval.decide"
  | "automation.manage"
  | "doc.create"
  | "multi_function_button.customise";

export type Scope = "self" | "team" | "department" | "company";

const MIN_ROLE: Record<Action, Role> = {
  "workspace.update":             "owner",
  "workspace.delete":             "owner",
  "department.create":            "manager",
  "department.update":            "manager",
  "department.delete":            "admin",
  "team.create":                  "manager",
  "team.update":                  "manager",
  "team.delete":                  "manager",
  "member.add":                   "admin",
  "member.remove":                "admin",
  "member.update_role":           "admin",
  "project.create":               "manager",
  "project.update":               "manager",
  "project.delete":               "manager",
  "task.create":                  "member",
  "task.assign":                  "manager",
  "task.approve":                 "manager",
  "task.complete":                "member",
  "task.delete":                  "manager",
  "task.comment":                 "guest",
  "task.prioritize":              "manager",
  "calendar.write_others":        "manager",
  "approval.decide":              "owner",
  "automation.manage":            "manager",
  "doc.create":                   "member",
  "multi_function_button.customise": "member",
};

// Single source of truth for UI hide-buttons + server-action gates.
// RLS is the third layer of defence — never the only one.
export function can(role: Role, action: Action, _scope: Scope = "self"): boolean {
  return isAtOrAbove(role, MIN_ROLE[action]);
}

export { ROLE_RANK, isAtOrAbove };
