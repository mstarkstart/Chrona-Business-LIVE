import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveBusiness } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { recommendAssignee } from "@/lib/tasks/recommendations";
import { availableWindows } from "@/lib/calendar/windows";
import { setTaskStatus, approveTask, rejectTask, assignTask } from "@/lib/tasks/mutations";
import { Card, CardTitle } from "@/components/dashboard/Cards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateTaskButton } from "@/components/shell/CreateTaskButton";

// Colour based on nearest deadline regardless of priority
function deadlineColor(due?: string | null) {
  if (!due) return "#6b7280";
  const days = (new Date(due).getTime() - Date.now()) / 86400000;
  if (days < 0) return "#ef4444"; // overdue
  if (days < 1) return "#ef4444"; // today
  if (days < 3) return "#f97316"; // very soon
  if (days < 7) return "#eab308"; // this week
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

  // Sort by nearest deadline (any priority)
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assigned_to_profiles_fkey(first_name, last_name)")
    .eq("business_id", active.business.id)
    .not("due_date", "is", null)
    .order("due_date", { ascending: true });

  const { data: noDeadlineTasks } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assigned_to_profiles_fkey(first_name, last_name)")
    .eq("business_id", active.business.id)
    .is("due_date", null)
    .order("created_at", { ascending: false });

  const allTasks = [...(tasks ?? []), ...(noDeadlineTasks ?? [])];
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
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground">{isPrimary ? "Primary view" : "My tasks"} · {active.business.name}</p>
        </div>
        {can(active.role, "task.create") && (
          <CreateTaskButton
            label="Create task"
            members={(members ?? []).map((m) => ({
              id: m.user_id,
              userId: m.user_id,
              name: nameOf(m.user_id),
            }))}
            businessId={active.business.id}
          />
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {priorityTasks.map((t) => (
          <Link key={t.id} href={`/tasks/${t.id}`}>
            <Card className="cursor-pointer hover:border-indigo-300">
              <div className="flex items-start gap-2">
                <span className="mt-1.5 h-2.5 w-2.5 rounded-full" style={{ background: deadlineColor(t.due_date) }} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t.due_date ? `Due ${fmtDate(new Date(t.due_date))}` : "No due date"}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">Priority: {t.priority}</div>
                </div>
              </div>
            </Card>
          </Link>
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
              <li key={t.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/tasks/${t.id}`} className="hover:text-indigo-600 transition-colors">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground capitalize mt-0.5">{t.priority} priority · {t.status.replace(/_/g, " ")}</div>
                  </Link>
                  <div className="flex gap-2 shrink-0">
                    {t.status === "pending" && (
                      <form action={setTaskStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="in_progress" /><Button size="sm" variant="outline">Start</Button></form>
                    )}
                    {t.status === "in_progress" && (
                      <form action={setTaskStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="completed" /><Button size="sm">Done</Button></form>
                    )}
                  </div>
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

      {/* Create task is now accessible via the + button in the right sidebar */}
    </div>
  );
}
