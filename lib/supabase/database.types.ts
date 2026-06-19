// Hand-maintained types mirroring supabase/setup.sql (workspaces + projects schema).
// Replace with `supabase gen types typescript ...` output before shipping if desired.

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

type TS = string; // ISO timestamp
type UUID = string;

export type Role = "owner" | "admin" | "manager" | "member" | "guest";
export type BusinessType = "self_employed" | "partnership" | "corporation";
export type ContractType = "full_time" | "contract_3m" | "contract_6m" | "contract_12m" | "custom";
export type MemberStatus = "invited" | "active" | "suspended" | "removed";
export type UiMode = "simple" | "advanced";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled" | "awaiting_approval" | "awaiting_acceptance";
export type NotificationType = "task_assignment" | "task_accepted" | "task_declined" | "task_approved" | "task_rejected" | "approval_request" | "task_completion";
export type ActivityStatus =
  | "available" | "tasking" | "meeting" | "lunch_break" | "personal_time" | "training" | "offline";
export type EventType = "meeting" | "task_block" | "break" | "lunch" | "training" | "focus" | "other";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";
export type CalendarProvider = "google" | "outlook";
export type ProjectStatus = "active" | "archived" | "completed";
export type ProjectTemplate = "software" | "agency" | "ops" | "blank";

// Insert/Update use indexable fallback so the postgrest-js generic resolves correctly
// without us having to spell out every nullable/default column.
type RowDef<T> = {
  Row: T;
  Insert: Partial<T> & { [k: string]: unknown };
  Update: Partial<T> & { [k: string]: unknown };
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      workspaces: RowDef<{
        id: UUID; name: string; founding_date: string | null;
        business_type: BusinessType; industry: string | null; services: string | null;
        employee_count_estimate: number | null; team_count_estimate: number | null;
        partnership_requires_approval: boolean; created_by: UUID | null; created_at: TS;
      }>;
      profiles: RowDef<{
        id: UUID; first_name: string | null; last_name: string | null;
        preferred_name: string | null; date_of_birth: string | null;
        gender: string | null; pronouns: string | null;
        personal_email: string | null; personal_phone: string | null;
        ui_mode: UiMode; created_at: TS;
        avatar_url: string | null;
      }>;
      departments: RowDef<{
        id: UUID; workspace_id: UUID; name: string; description: string | null; created_at: TS;
      }>;
      teams: RowDef<{
        id: UUID; workspace_id: UUID; department_id: UUID | null;
        name: string; description: string | null; created_at: TS;
      }>;
      workspace_members: RowDef<{
        id: UUID; workspace_id: UUID; user_id: UUID; role: Role;
        position: string | null; department_id: UUID | null; team_id: UUID | null;
        date_joined: string | null; company_email: string | null; work_phone: string | null;
        is_owner: boolean; contract_type: ContractType; contract_end_date: string | null;
        status: MemberStatus; created_at: TS;
      }>;
      partners: RowDef<{
        id: UUID; workspace_id: UUID; user_id: UUID;
        share_percentage: number | null; created_at: TS;
      }>;
      approval_requests: RowDef<{
        id: UUID; workspace_id: UUID; requested_by: UUID; action_type: string;
        payload: Json; status: ApprovalStatus; decided_by: UUID | null;
        decided_at: TS | null; created_at: TS;
      }>;
      projects: RowDef<{
        id: UUID; workspace_id: UUID; name: string; description: string | null;
        status: ProjectStatus; template: ProjectTemplate | null;
        created_by: UUID | null; created_at: TS;
      }>;
      project_members: RowDef<{
        id: UUID; project_id: UUID; user_id: UUID; role: Role; added_at: TS;
      }>;
      tasks: RowDef<{
        id: UUID; workspace_id: UUID; project_id: UUID | null; parent_task_id: UUID | null;
        title: string; description: string | null;
        priority: TaskPriority; status: TaskStatus;
        assigned_to: UUID | null; assigned_team_id: UUID | null; assigned_department_id: UUID | null;
        created_by: UUID; position: number; labels: string[]; watchers: UUID[];
        estimated_hours: number | null;
        due_date: TS | null; start_at: TS | null; end_at: TS | null;
        completed_at: TS | null; requires_approval: boolean; approved_by: UUID | null; created_at: TS;
      }>;
      activity_status: RowDef<{ workspace_member_id: UUID; status: ActivityStatus; updated_at: TS; task_id: UUID | null }>;
      activity_log: RowDef<{
        id: UUID; workspace_member_id: UUID; workspace_id: UUID;
        status: ActivityStatus; started_at: TS; ended_at: TS | null; task_id: UUID | null;
      }>;
      calendar_events: RowDef<{
        id: UUID; workspace_id: UUID; owner_id: UUID; title: string;
        event_type: EventType; start_at: TS; end_at: TS;
        task_id: UUID | null; external_provider: CalendarProvider | null;
        external_id: string | null; created_at: TS;
        is_team: boolean;
      }>;
      notifications: RowDef<{
        id: UUID; workspace_id: UUID; user_id: UUID;
        type: NotificationType; title: string; body: string | null;
        task_id: UUID | null; read_at: TS | null; created_at: TS;
      }>;
      invitations: RowDef<{
        id: UUID; workspace_id: UUID; email: string; role: Role;
        department_id: UUID | null; team_id: UUID | null; position: string | null;
        contract_type: ContractType; contract_end_date: string | null;
        token: string; invited_by: UUID; accepted_at: TS | null; expires_at: TS; created_at: TS;
      }>;
      multi_function_button_config: RowDef<{
        user_id: UUID; workspace_id: UUID; actions: Json;
      }>;
      task_comments: RowDef<{
        id: UUID; task_id: UUID; workspace_id: UUID; author_id: UUID;
        body: string; created_at: TS; updated_at: TS;
      }>;
      task_attachments: RowDef<{
        id: UUID; task_id: UUID; workspace_id: UUID; uploader_id: UUID;
        file_name: string; file_url: string; file_size: number | null; created_at: TS;
      }>;
      member_points: RowDef<{
        id: UUID; workspace_id: UUID; user_id: UUID;
        points: number; tasks_completed: number; streak_days: number;
        last_activity: string | null; updated_at: TS;
      }>;
      point_events: RowDef<{
        id: UUID; workspace_id: UUID; user_id: UUID;
        event_type: string; points: number; description: string | null;
        task_id: UUID | null; created_at: TS;
      }>;
      chat_messages: RowDef<{
        id: UUID; workspace_id: UUID; user_id: UUID;
        body: string; created_at: TS;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      set_active_workspace: { Args: { p_workspace_id: UUID | null }; Returns: void };
      current_workspace_id: { Args: Record<string, never>; Returns: UUID | null };
      current_user_role: { Args: { p_workspace_id: UUID }; Returns: Role | null };
      is_role_at_or_above: { Args: { p_workspace_id: UUID; p_role: Role }; Returns: boolean };
      is_member_of: { Args: { p_workspace_id: UUID }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
