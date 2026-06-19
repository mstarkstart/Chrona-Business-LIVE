"use client";

import { useState, useTransition, useEffect } from "react";
import { Plus, X, Calendar, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { syncTaskCalendarEventAction } from "@/lib/tasks/mutations";

type Member = { id: string; name: string; userId: string };

const PRIORITY_DOT: Record<string, string> = {
  low:    "bg-zinc-400",
  normal: "bg-indigo-500",
  high:   "bg-orange-500",
  urgent: "bg-red-500",
};

const PRIORITY_OPTIONS = [
  { value: "low",    label: "🔵  Low"    },
  { value: "normal", label: "🟢  Normal" },
  { value: "high",   label: "🟠  High"   },
  { value: "urgent", label: "🔴  Urgent" },
];

function DateInput({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Calendar className="h-3 w-3" />
        {label}
      </label>
      <div className="flex gap-1.5 mt-1.5">
        <input
          name={`${name}_date`}
          type="date"
          className="flex-1 min-w-0 h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
                     focus:bg-white transition-all duration-200 cursor-pointer"
        />
        <div className="relative flex-none">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            name={`${name}_time`}
            type="time"
            className="w-[130px] h-10 rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-sm text-foreground
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
                       focus:bg-white transition-all duration-200 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

export function CreateTaskButton({
  members,
  businessId,
  label,
  role = "member",
}: {
  members: Member[];
  businessId: string;
  label?: string;
  role?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [priority, setPriority] = useState("normal");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    });
  }, []);

  const canSetPriority = ["manager", "admin", "owner"].includes(role);
  const canAssign = ["manager", "admin", "owner"].includes(role);
  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name));
  const filteredMembers = canAssign
    ? sortedMembers
    : sortedMembers.filter((m) => m.userId === currentUserId);

  function handleClose() {
    setOpen(false);
    setError(null);
    setPriority("normal");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title       = String(fd.get("title") ?? "").trim();
    const description = String(fd.get("description") ?? "").trim();
    const assigned_to = String(fd.get("assigned_to") ?? "") || null;
    const requires_approval = fd.get("requires_approval") === "on";

    // Combine split date + time fields
    const startDate = String(fd.get("start_at_date") ?? "");
    const startTime = String(fd.get("start_at_time") ?? "");
    const dueDate   = String(fd.get("due_date_date") ?? "");
    const dueTime   = String(fd.get("due_date_time") ?? "");

    const start_at = startDate ? `${startDate}T${startTime || "00:00"}` : null;
    const due_date = dueDate   ? `${dueDate}T${dueTime || "00:00"}`     : null;

    if (!title) { setError("Title is required."); return; }

    startTransition(async () => {
      setError(null);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const newStatus = assigned_to ? "awaiting_acceptance" : "pending";

      const { data: task, error: err } = await supabase.from("tasks").insert({
        workspace_id: businessId,
        title,
        description: description || null,
        priority: "normal", // Forced default to Normal
        status: newStatus,
        assigned_to,
        due_date,
        start_at,
        requires_approval,
        created_by: user.user.id,
      }).select().single();

      if (err) { setError(err.message); return; }

      if (task) {
        await syncTaskCalendarEventAction(task.id);
      }

      if (assigned_to && task) {
        await fetch("/api/notifications/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: assigned_to,
            businessId,
            type: "task_assignment",
            title: `You've been assigned: ${title}`,
            body: description || null,
            taskId: task.id,
          }),
        });
      }

      handleClose();
      router.refresh();
    });
  }

  return (
    <>
      {label ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Plus className="h-4 w-4" />
          {label}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="h-7 w-7 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm hover:brightness-110 active:scale-95 transition-all shrink-0"
          title="Create task"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={handleClose} />

          <div className="relative w-full max-w-lg animate-fade-up rounded-3xl bg-white border border-border shadow-2xl shadow-indigo-100/80 overflow-hidden">
            {/* Top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Create task</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Assign it and the employee will need to accept.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="h-8 w-8 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Title *
                </label>
                <input
                  name="title"
                  required
                  placeholder="What needs to get done?"
                  className="mt-1.5 w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
                             focus:bg-white transition-all duration-200"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <textarea
                  name="description"
                  placeholder="Optional details…"
                  rows={2}
                  className="mt-1.5 w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm resize-none
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
                             focus:bg-white transition-all duration-200"
                />
              </div>

              {/* Assign row */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Assign to
                </label>
                <select
                  name="assigned_to"
                  className="mt-1.5 w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
                             focus:bg-white transition-all duration-200 cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {filteredMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Dates — split date + time pickers */}
              <div className="space-y-4">
                <DateInput name="start_at" label="Start date" />
                <DateInput name="due_date" label="Due date" />
              </div>

              {/* Requires approval */}
              <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
                <input
                  type="checkbox"
                  name="requires_approval"
                  className="h-4 w-4 rounded border-border text-indigo-600 cursor-pointer"
                />
                <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                  Requires approval before starting
                </span>
              </label>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-primary text-white px-5 py-2.5 text-sm font-semibold shadow-md hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  {pending ? "Creating…" : "Create task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
