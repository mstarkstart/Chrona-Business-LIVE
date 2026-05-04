import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveBusiness } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { recommendAssignee } from "@/lib/tasks/recommendations";
import { availableWindows } from "@/lib/calendar/windows";
import { createTask, setTaskStatus, approveTask, rejectTask, assignTask } from "@/lib/tasks/mutations";
import { Card, CardTitle } from "@/components/dashboard/Cards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function priorityColor(p: string, due?: string | null) {
  if (p === "urgent") return "#ef4444";
  if (due && new Date(due) < new Date()) return "#ef4444";
  if (p === "high") return "#f97316";
  if (p === "normal") return "#eab308";
  return "#22c55e";
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default async function TasksPage() {
  const user = await requireUser();
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();

  const isPrimary = ["employer", "c_suite", "manager", "team_lead"].includes(active.role);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assigned_to_profiles_fkey(first_name, last_name)")
    .eq("business_id", active.business.id)
    .order("priority", { ascending: false })
    .order("due_date", { ascending: true });

  const allTasks = tasks ?? [];
  const myTasks = allTasks.filter((t) => t.assigned_to === user.id && t.status !== "completed");
  const priorityTasks = allTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").slice(0, 3);
  const awaiting = allTasks.filter((t) => t.status === "awaiting_approval");
  const unassigned = allTasks.filter((t) => !t.assigned_to && t.status === "pending");

  const completedToday = allTasks.filter((t) => t.status === "completed" && t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString()).length;
  const remaining = allTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length;

  const windows = await availableWindows(active.business.id, user.id, 7);
  const recommendation = isPrimary ? await recommendAssignee(active.business.id) : null;

  // Member list for assignment dropdowns.
  const { data: members } = await supabase
    .from("business_members")
    .select("user_id, profiles!business_members_user_id_profiles_fkey(first_name, last_name)")
    .eq("business_id", active.business.id)
    .eq("status", "active");

  const nameOf = (uid: string | null | undefined) => {
    if (!uid) return "Unassigned";
    const m = members?.find((x) => x.user_id === uid);
    const p = (m as unknown as { profiles?: { first_name?: string; last_name?: string } } | undefined)?.profiles;
    return [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Member";
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <header>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className="text-sm text-muted-foreground">{isPrimary ? "Primary view" : "My tasks"} · {active.business.name}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {priorityTasks.map((t) => (
          <Card key={t.id}>
            <div className="flex items-start gap-2">
              <span className="mt-1.5 h-2.5 w-2.5 rounded-full" style={{ background: priorityColor(t.priority, t.due_date) }} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{t.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t.due_date ? `Due ${fmtDate(new Date(t.due_date))}` : "No due date"}
                </div>
                <div className="text-xs text-muted-foreground capitalize">Priority: {t.priority}</div>
              </div>
            </div>
          </Card>
        ))}
        {priorityTasks.length === 0 && <Card><span className="text-sm text-muted-foreground italic">No active priority tasks.</span></Card>}
      </div>

      <Card>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Today</CardTitle>
            <p className="text-sm mt-1">Completed: <strong>{completedToday}</strong> · Remaining: <strong>{remaining}</strong></p>
          </div>
        </div>
      </Card>

      {!isPrimary && (
        <Card>
          <CardTitle>My tasks</CardTitle>
          <ul className="mt-3 space-y-2">
            {myTasks.length === 0 && <li className="text-sm text-muted-foreground italic">Nothing assigned.</li>}
            {myTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground capitalize">{t.priority} · {t.status.replace("_", " ")}</div>
                </div>
                <div className="flex gap-2">
                  {t.status !== "in_progress" && (
                    <form action={setTaskStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="in_progress" /><Button size="sm" variant="outline">Start</Button></form>
                  )}
                  <form action={setTaskStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="completed" /><Button size="sm">Done</Button></form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {isPrimary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardTitle>Awaiting approval</CardTitle>
            <ul className="mt-3 space-y-2">
              {awaiting.length === 0 && <li className="text-sm text-muted-foreground italic">No pending approvals.</li>}
              {awaiting.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm">
                  <span>{t.title}</span>
                  <div className="flex gap-1">
                    <form action={approveTask}><input type="hidden" name="id" value={t.id} /><Button size="sm">Approve</Button></form>
                    <form action={rejectTask}><input type="hidden" name="id" value={t.id} /><Button size="sm" variant="outline">Deny</Button></form>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardTitle>Available windows (next 7 days)</CardTitle>
            <ul className="mt-3 space-y-1 text-sm">
              {windows.length === 0 && <li className="text-muted-foreground italic">No free windows found.</li>}
              {windows.slice(0, 8).map((w, i) => (
                <li key={i}>
                  {fmtDate(w.start)} – {w.end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {isPrimary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardTitle>Recommendations</CardTitle>
            {recommendation ? (
              <p className="mt-3 text-sm">Smart-assign suggests <strong>{recommendation.name}</strong> for the next unassigned task (lowest current load).</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground italic">No active members yet.</p>
            )}
          </Card>

          <Card>
            <CardTitle>Assign manually</CardTitle>
            <ul className="mt-3 space-y-2">
              {unassigned.length === 0 && <li className="text-sm text-muted-foreground italic">All tasks have an assignee.</li>}
              {unassigned.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{t.title}</span>
                  <form action={assignTask} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={t.id} />
                    <select name="assigned_to" className="h-8 rounded-md border border-border bg-card px-2 text-xs">
                      <option value="">Pick…</option>
                      {(members ?? []).map((m) => (
                        <option key={m.user_id} value={m.user_id}>{nameOf(m.user_id)}</option>
                      ))}
                    </select>
                    <Button size="sm">Assign</Button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {can(active.role, "task.create") && (
        <Card>
          <CardTitle>Create a task</CardTitle>
          <form action={createTask} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><Label>Title</Label><Input name="title" required /></div>
            <div className="md:col-span-2"><Label>Description</Label><Input name="description" /></div>
            <div>
              <Label>Priority</Label>
              <select name="priority" defaultValue="normal" className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <Label>Assignee</Label>
              <select name="assigned_to" className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm">
                <option value="">Unassigned</option>
                {(members ?? []).map((m) => (
                  <option key={m.user_id} value={m.user_id}>{nameOf(m.user_id)}</option>
                ))}
              </select>
            </div>
            <div><Label>Due date</Label><Input name="due_date" type="datetime-local" /></div>
            <div><Label>Start</Label><Input name="start_at" type="datetime-local" /></div>
            <div><Label>End</Label><Input name="end_at" type="datetime-local" /></div>
            <div className="flex items-end gap-2">
              <label className="text-sm flex items-center gap-2"><input type="checkbox" name="requires_approval" /> Requires approval</label>
            </div>
            <div className="md:col-span-2"><Button type="submit">Create task</Button></div>
          </form>
        </Card>
      )}
    </div>
  );
}
