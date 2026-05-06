import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveBusiness } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { Calendar, Clock, Flag, User2, AlignLeft, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Tables, TaskPriority, TaskStatus } from "@/lib/supabase/types";

const STATUS_COLOUR: Record<TaskStatus, string> = {
  pending:              "bg-gray-100 text-gray-700",
  in_progress:          "bg-amber-100 text-amber-700",
  completed:            "bg-emerald-100 text-emerald-700",
  cancelled:            "bg-red-100 text-red-700",
  awaiting_approval:    "bg-orange-100 text-orange-700",
  awaiting_acceptance:  "bg-indigo-100 text-indigo-700",
};

const PRIORITY_COLOUR: Record<TaskPriority, string> = {
  low:    "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-700",
  high:   "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assigned_to_profiles_fkey(first_name, last_name)")
    .eq("id", id)
    .eq("business_id", active.business.id)
    .single();

  if (!task) notFound();

  const t = task as unknown as Tables<"tasks"> & {
    assignee?: { first_name: string | null; last_name: string | null } | null;
  };

  const assigneeName = t.assignee
    ? [t.assignee.first_name, t.assignee.last_name].filter(Boolean).join(" ") || "Member"
    : null;

  return (
    <div className="p-6 max-w-2xl">
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tasks
      </Link>

      <div className="rounded-3xl bg-white border border-border shadow-sm overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />

        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h1 className="text-xl font-bold tracking-tight leading-tight">{t.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOUR[t.status as TaskStatus]}`}>
              {t.status.replace(/_/g, " ")}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_COLOUR[t.priority as TaskPriority]}`}>
              <Flag className="inline h-2.5 w-2.5 mr-1" />
              {t.priority}
            </span>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {t.description && (
            <div className="flex gap-3">
              <AlignLeft className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</div>
                <p className="text-sm text-gray-700 leading-relaxed">{t.description}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Due date</div>
                <div className="text-sm">{fmtDate(t.due_date)}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Start date</div>
                <div className="text-sm">{fmtDate(t.start_at)}</div>
              </div>
            </div>

            {assigneeName && (
              <div className="flex gap-2">
                <User2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Assigned to</div>
                  <div className="text-sm">{assigneeName}</div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Created</div>
                <div className="text-sm">{fmtDate(t.created_at)}</div>
              </div>
            </div>
          </div>

          {t.requires_approval && (
            <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-2.5 text-sm text-orange-700">
              This task requires approval before it can start.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
