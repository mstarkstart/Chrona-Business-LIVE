"use client";

import { useState } from "react";
import { X, Calendar, Flag, User2, Clock, AlignLeft } from "lucide-react";
import type { Tables, TaskPriority, TaskStatus } from "@/lib/supabase/types";

type Task = Tables<"tasks"> & {
  assignee_name?: string | null;
};

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

export function TaskDetailDialog({ task, children }: { task: Task; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
      >
        {children}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-lg animate-fade-up rounded-3xl bg-white border border-border shadow-2xl shadow-indigo-100 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />

            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border">
              <div className="flex-1 pr-4">
                <h2 className="text-lg font-bold tracking-tight leading-tight">{task.title}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOUR[task.status as TaskStatus]}`}>
                    {task.status.replace(/_/g, " ")}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_COLOUR[task.priority as TaskPriority]}`}>
                    <Flag className="inline h-2.5 w-2.5 mr-1" />
                    {task.priority}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {task.description && (
                <div className="flex gap-3">
                  <AlignLeft className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</div>
                    <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Due date</div>
                    <div className="text-sm">{fmtDate(task.due_date)}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Start date</div>
                    <div className="text-sm">{fmtDate(task.start_at)}</div>
                  </div>
                </div>

                {task.end_at && (
                  <div className="flex gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">End date</div>
                      <div className="text-sm">{fmtDate(task.end_at)}</div>
                    </div>
                  </div>
                )}

                {task.assignee_name && (
                  <div className="flex gap-2">
                    <User2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Assigned to</div>
                      <div className="text-sm">{task.assignee_name}</div>
                    </div>
                  </div>
                )}
              </div>

              {task.requires_approval && (
                <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-2.5 text-sm text-orange-700">
                  This task requires approval before it can start.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
