export type {
  Database,
  Json,
  Role,
  BusinessType,
  ContractType,
  MemberStatus,
  TaskPriority,
  TaskStatus,
  ActivityStatus,
  EventType,
  ApprovalStatus,
  CalendarProvider,
} from "./database.types";

import type { Database } from "./database.types";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertOf<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateOf<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
