"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Member = { id: string; name: string; userId: string };

export function CreateTaskButton({
  members,
  businessId,
  label,
}: {
  members: Member[];
  businessId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title       = String(fd.get("title") ?? "").trim();
    const description = String(fd.get("description") ?? "").trim();
    const priority    = String(fd.get("priority") ?? "normal");
    const assigned_to = String(fd.get("assigned_to") ?? "") || null;
    const due_date    = String(fd.get("due_date") ?? "") || null;
    const start_at    = String(fd.get("start_at") ?? "") || null;
    const requires_approval = fd.get("requires_approval") === "on";

    if (!title) { setError("Title is required."); return; }

    startTransition(async () => {
      setError(null);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const newStatus = assigned_to ? "awaiting_acceptance" : "pending";

      const { data: task, error: err } = await supabase.from("tasks").insert({
        business_id: businessId,
        title,
        description: description || null,
        priority: priority as "low" | "normal" | "high" | "urgent",
        status: newStatus,
        assigned_to,
        due_date,
        start_at,
        requires_approval,
        created_by: user.user.id,
      }).select().single();

      if (err) { setError(err.message); return; }

      // If assigned, create a notification for the assignee via service action
      if (assigned_to && task) {
        // Call the server-side notification creation
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

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {/* Trigger — small icon when no label, full button when label provided */}
      {label ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md glow-sm hover:brightness-110 active:scale-[0.98] transition-all"
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

      {/* Modal backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Dialog — same animation as MFB fan-out */}
          <div className="relative w-full max-w-lg animate-fade-up rounded-3xl bg-white border border-border shadow-2xl shadow-indigo-100 overflow-hidden">
            {/* Gradient top strip */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Create task</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  If you assign it, the employee will need to accept.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Title *
                </label>
                <input
                  name="title"
                  required
                  placeholder="What needs to get done?"
                  className="mt-1.5 w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm focus:border-indigo-500/50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <textarea
                  name="description"
                  placeholder="Optional details…"
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm resize-none focus:border-indigo-500/50 focus:bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Priority
                  </label>
                  <select
                    name="priority"
                    defaultValue="normal"
                    className="mt-1.5 w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Assign to
                  </label>
                  <select
                    name="assigned_to"
                    className="mt-1.5 w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Due date
                  </label>
                  <input
                    name="due_date"
                    type="datetime-local"
                    className="mt-1.5 w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Start
                  </label>
                  <input
                    name="start_at"
                    type="datetime-local"
                    className="mt-1.5 w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" name="requires_approval" className="rounded" />
                <span>Requires approval before starting</span>
              </label>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-primary text-white px-5 py-2.5 text-sm font-semibold shadow-md hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
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
