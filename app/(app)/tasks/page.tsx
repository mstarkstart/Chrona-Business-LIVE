import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
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
import { ProjectBoard } from "@/components/projects/ProjectBoard";
import { List, Kanban, Calendar as CalendarIcon, Clock, CheckCircle2, ShieldAlert, Sparkles, Users } from "lucide-react";
import { TasksAnimated } from "@/components/tasks/TasksAnimated";

function deadlineColor(due?: string | null) {
  if (!due) return "#9ca3af";
  const days = (new Date(due).getTime() - Date.now()) / 86400000;
  if (days < 0) return "#fb7185"; // overdue
  if (days < 1) return "#fb7185"; // today
  if (days < 3) return "#fb923c"; // very soon
  if (days < 7) return "#fbbf24"; // this week
  return "#34d399";
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; new?: string; myWork?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const view = params.view ?? "list";
  const myWorkMode = params.myWork === "1";
  const workspaceTab = params.tab ?? "active";

  const user = await requireUser();
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  const isPrimary = ["owner", "admin", "manager"].includes(active.role);

  // Sort by nearest deadline
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assigned_to_profiles_fkey(first_name, last_name)")
    .eq("workspace_id", active.workspace.id)
    .not("due_date", "is", null)
    .order("due_date", { ascending: true });

  const { data: noDeadlineTasks } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assigned_to_profiles_fkey(first_name, last_name)")
    .eq("workspace_id", active.workspace.id)
    .is("due_date", null)
    .order("created_at", { ascending: false });

  const allTasks = [...(tasks ?? []), ...(noDeadlineTasks ?? [])];
  
  // Scoped task lists
  const myTasks = allTasks.filter((t) => t.assigned_to === user.id && t.status !== "completed");
  const myCreatedTasks = isPrimary
    ? allTasks.filter((t) => t.created_by === user.id && !t.assigned_to && t.status !== "completed" && t.status !== "cancelled")
    : [];
  const priorityTasks = allTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").slice(0, 3);
  const awaiting = allTasks.filter((t) => t.status === "awaiting_approval");
  const unassigned = allTasks.filter((t) => !t.assigned_to && t.status === "pending");

  const completedToday = allTasks.filter(
    (t) => t.status === "completed" && t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString()
  ).length;
  const remaining = allTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length;

  const windows = await availableWindows(active.workspace.id, user.id, 7);
  const recommendation = isPrimary ? await recommendAssignee(active.workspace.id) : null;

  // Member list for assignment dropdowns.
  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, profiles!workspace_members_user_id_profiles_fkey(first_name, last_name)")
    .eq("workspace_id", active.workspace.id)
    .eq("status", "active");

  const nameOf = (uid: string | null | undefined) => {
    if (!uid) return "Unassigned";
    const m = members?.find((x) => x.user_id === uid);
    const p = (m as any)?.profiles;
    return [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Teammate";
  };

  const memberOptions = (members ?? [])
    .map((m) => ({ id: m.user_id, userId: m.user_id, name: nameOf(m.user_id) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const sortedMembersForAssign = [...(members ?? [])].sort((a, b) =>
    nameOf(a.user_id).localeCompare(nameOf(b.user_id))
  );

  const priorityStyles: Record<string, string> = {
    urgent: "border-l-4 border-l-red-500 bg-red-50",
    high: "border-l-4 border-l-orange-450 bg-orange-50",
    normal: "border-l-4 border-l-indigo-400 bg-indigo-500/10",
    low: "border-l-4 border-l-zinc-400 bg-muted",
  };

  const priorityTexts: Record<string, string> = {
    urgent: "text-red-650 bg-red-50 border-red-200",
    high: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    normal: "text-primary bg-primary/10 border-primary/20",
    low: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
  };

  const tabClass = (active: boolean) => 
    `px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
      active 
        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
        : "text-muted-foreground hover:text-foreground bg-accent"
    }`;

  // Filter based on selected workspace tab
  const displayedWorkspaceTasks = allTasks.filter((t) => {
    if (workspaceTab === "active") {
      return t.status !== "completed" && t.status !== "cancelled";
    } else if (workspaceTab === "created") {
      return t.created_by === user.id;
    } else if (workspaceTab === "unassigned") {
      return !t.assigned_to && t.status === "pending";
    } else if (workspaceTab === "completed") {
      return t.status === "completed";
    }
    return false;
  });

  return (
    <div className={`p-8 space-y-8 mx-auto ${view === "kanban" ? "w-full max-w-full" : "max-w-6xl"}`}>
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isPrimary
              ? myWorkMode ? "Personal Work List" : "Workspace Tasks"
              : "My Tasks"} · {active.workspace.name}
          </p>
        </div>
        
        <div className="flex items-center gap-4.5 flex-wrap">
          {/* My Work / Workspace toggle for primary roles */}
          {isPrimary && (
            <div className="flex bg-accent p-1 rounded-xl border border-border backdrop-blur-sm">
              <Link
                href={`/tasks?view=${view}&myWork=1${workspaceTab !== "active" ? `&tab=${workspaceTab}` : ""}`}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  myWorkMode
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                My Work
              </Link>
              <Link
                href={`/tasks?view=${view}${workspaceTab !== "active" ? `&tab=${workspaceTab}` : ""}`}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  !myWorkMode
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Workspace
              </Link>
            </div>
          )}
          
          {/* Kanban / List Toggle */}
          <div className="flex bg-accent p-1 rounded-xl border border-border backdrop-blur-sm">
            <Link
              href={`/tasks?view=list${myWorkMode ? "&myWork=1" : ""}${workspaceTab !== "active" ? `&tab=${workspaceTab}` : ""}`}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                view === "list"
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </Link>
            <Link
              href={`/tasks?view=kanban${myWorkMode ? "&myWork=1" : ""}${workspaceTab !== "active" ? `&tab=${workspaceTab}` : ""}`}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                view === "kanban"
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Board</span>
            </Link>
          </div>

          {can(active.role, "task.create") && (
            <CreateTaskButton
              label="Create task"
              members={memberOptions}
              businessId={active.workspace.id}
              role={active.role}
            />
          )}
        </div>
      </header>

      <TasksAnimated>
      {view === "kanban" ? (
        <div className="pt-2">
          {/* Members only see their own tasks on the board; managers/owners see all */}
          <ProjectBoard
            tasks={active.role === "member" ? allTasks.filter((t) => t.assigned_to === user.id) : allTasks}
            workspaceId={active.workspace.id}
            currentUserId={user.id}
            role={active.role}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Priority Tasks Grid */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Urgent Actions</h2>            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {priorityTasks.map((t) => {
                const glowClass = t.priority === "urgent" ? "priority-glow-urgent" : t.priority === "high" ? "priority-glow-high" : "";
                const accent = deadlineColor(t.due_date);
                return (
                  <Link key={t.id} href={`/tasks/${t.id}`}>
                    <div 
                      className={`cursor-pointer rounded-xl border border-border p-4 flex flex-col justify-between hover:bg-accent transition-all hover:border-indigo-200 ${glowClass} backdrop-blur-sm h-full bg-card shadow-sm`}
                      style={{ borderLeft: `4px solid ${accent}` }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span 
                            className="h-2 w-2 rounded-full shrink-0 status-spark" 
                            style={{ background: accent, ["--spark-color" as string]: accent }} 
                          />
                          <span className="text-[10px] text-muted-foreground font-mono font-bold tracking-wider">
                            {"TK-" + t.id.slice(0, 4).toUpperCase()}
                          </span>
                        </div>
                        <h4 className="font-semibold text-foreground mt-1 line-clamp-2 text-sm">
                          {t.title}
                        </h4>
                      </div>
                      
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-4">
                        <span>{t.due_date ? `Due ${fmtDate(new Date(t.due_date))}` : "No due date"}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${priorityTexts[t.priority]}`}>
                          {t.priority}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
              {priorityTasks.length === 0 && (
                <div className="col-span-3 text-center py-6 border border-dashed border-border rounded-xl bg-muted">
                  <span className="text-xs text-muted-foreground italic">No active priority tasks.</span>
                </div>
              )}
            </div>
          </div>
 
          <div className="rounded-xl border border-border bg-card p-5 backdrop-blur-sm shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">Today&apos;s Summary</h2>
            <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Completed today: <strong className="text-foreground">{completedToday}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-500" />
                Remaining: <strong className="text-foreground">{remaining}</strong>
              </span>
            </div>
          </div>

          {/* My tasks section */}
          {(!isPrimary || myWorkMode) && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">{isPrimary ? "My Work" : "Assigned to Me"}</h2>
              <ul className="space-y-3">
                {myTasks.length === 0 && (
                  <li className="text-center py-10 border border-dashed border-border rounded-xl bg-muted text-sm text-muted-foreground italic">
                    Nothing assigned to you.
                  </li>
                )}
                {myTasks.map((t) => {
                  const isOverdue = t.due_date && (new Date(t.due_date).getTime() - Date.now()) / 86400000 < 0;
                  const isDueSoon = t.due_date && (new Date(t.due_date).getTime() - Date.now()) / 86400000 < 3 && !isOverdue;
                  const isUrgent = t.priority === "urgent";
                  const isHigh   = t.priority === "high";
                  const updatedRecently = t.created_at && (Date.now() - new Date(t.created_at).getTime()) < 86400000;
                  const glowClass = isUrgent ? "priority-glow-urgent" : isHigh ? "priority-glow-high" : "";
                  const styleAccent = priorityStyles[t.priority] || "border-l-4 border-l-zinc-350 bg-muted";
                  
                  return (
                    <li 
                      key={t.id} 
                      className={`relative rounded-xl border border-border p-4 text-xs ${glowClass} ${styleAccent} hover:border-indigo-200 hover:bg-accent/50 transition-all duration-200 bg-card shadow-sm`}
                    >
                      {updatedRecently && (
                        <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          Updated
                        </span>
                      )}
                      
                      <div className="flex items-start justify-between gap-4">
                        <Link href={`/tasks/${t.id}`} className="hover:text-primary transition-colors flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                            {t.title}
                          </h4>
                          
                          <div className="flex items-center gap-2 mt-2 flex-wrap text-muted-foreground">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${priorityTexts[t.priority]}`}>
                              {t.priority}
                            </span>
                            <span>·</span>
                            <span className="capitalize">{t.status.replace(/_/g, " ")}</span>
                            {isOverdue && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse-soft">
                                Overdue
                              </span>
                            )}
                            {isDueSoon && !isOverdue && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                Due soon
                              </span>
                            )}
                            {t.due_date && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 ml-2">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                {new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </Link>
                        
                        <div className="flex gap-2 shrink-0 self-center">
                          {t.status === "pending" && (
                            <form action={setTaskStatus}>
                              <input type="hidden" name="id" value={t.id} />
                              <input type="hidden" name="status" value="in_progress" />
                              <Button size="sm" className="h-8.5 text-xs font-semibold cursor-pointer active:scale-95">
                                Start Work
                              </Button>
                            </form>
                          )}
                          {t.status === "in_progress" && (
                            <form action={setTaskStatus}>
                              <input type="hidden" name="id" value={t.id} />
                              <input type="hidden" name="status" value="completed" />
                              <Button size="sm" className="h-8.5 text-xs font-semibold cursor-pointer active:scale-95 bg-emerald-600 hover:bg-emerald-500">
                                Mark Done
                              </Button>
                            </form>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Workspace tasks section */}
          {isPrimary && !myWorkMode && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
                <h2 className="text-lg font-bold text-foreground">Workspace Tasks</h2>
                <div className="flex items-center gap-1.5 bg-accent p-1 rounded-xl border border-border shrink-0">
                  <Link
                    href={`/tasks?view=list&myWork=0&tab=active`}
                    className={tabClass(workspaceTab === "active")}
                  >
                    Active ({allTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length})
                  </Link>
                  <Link
                    href={`/tasks?view=list&myWork=0&tab=created`}
                    className={tabClass(workspaceTab === "created")}
                  >
                    Created ({allTasks.filter((t) => t.created_by === user.id).length})
                  </Link>
                  <Link
                    href={`/tasks?view=list&myWork=0&tab=unassigned`}
                    className={tabClass(workspaceTab === "unassigned")}
                  >
                    Unassigned ({unassigned.length})
                  </Link>
                  <Link
                    href={`/tasks?view=list&myWork=0&tab=completed`}
                    className={tabClass(workspaceTab === "completed")}
                  >
                    Completed ({allTasks.filter((t) => t.status === "completed").length})
                  </Link>
                </div>
              </div>

              <ul className="space-y-3">
                {displayedWorkspaceTasks.length === 0 && (
                  <li className="text-center py-10 border border-dashed border-border rounded-xl bg-muted text-sm text-muted-foreground italic">
                    No tasks found in this tab.
                  </li>
                )}
                {displayedWorkspaceTasks.map((t) => {
                  const isOverdue = t.due_date && (new Date(t.due_date).getTime() - Date.now()) / 86400000 < 0;
                  const isDueSoon = t.due_date && (new Date(t.due_date).getTime() - Date.now()) / 86400000 < 3 && !isOverdue;
                  const isUrgent = t.priority === "urgent";
                  const isHigh   = t.priority === "high";
                  const updatedRecently = t.created_at && (Date.now() - new Date(t.created_at).getTime()) < 86400000;
                  const glowClass = isUrgent ? "priority-glow-urgent" : isHigh ? "priority-glow-high" : "";
                  const styleAccent = priorityStyles[t.priority] || "border-l-4 border-l-zinc-350 bg-muted";
                  
                  return (
                    <li 
                      key={t.id} 
                      className={`relative rounded-xl border border-border p-4 text-xs ${glowClass} ${styleAccent} hover:border-indigo-200 hover:bg-accent/50 transition-all duration-200 bg-card shadow-sm`}
                    >
                      {updatedRecently && (
                        <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          Updated
                        </span>
                      )}
                      
                      <div className="flex items-start justify-between gap-4">
                        <Link href={`/tasks/${t.id}`} className="hover:text-primary transition-colors flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                            {t.title}
                          </h4>
                          
                          <div className="flex items-center gap-2 mt-2 flex-wrap text-muted-foreground">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${priorityTexts[t.priority]}`}>
                              {t.priority}
                            </span>
                            <span>·</span>
                            <span className="capitalize">{t.status.replace(/_/g, " ")}</span>
                            <span>·</span>
                            <span className="font-bold text-foreground bg-accent px-2 py-0.5 rounded border border-border inline-flex items-center gap-1">
                              👤 {nameOf(t.assigned_to)}
                            </span>
                            {isOverdue && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse-soft">
                                Overdue
                              </span>
                            )}
                            {isDueSoon && !isOverdue && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                Due soon
                              </span>
                            )}
                            {t.due_date && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 ml-2">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                {new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </Link>
                        
                        <div className="flex gap-2 shrink-0 self-center">
                          <Link href={`/tasks/${t.id}`}>
                            <Button size="sm" variant="outline" className="h-8.5 text-xs font-semibold cursor-pointer">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Workspace-level cards for managers/owners */}
          {isPrimary && !myWorkMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-5 backdrop-blur-sm space-y-4 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <span>Awaiting Approval</span>
                </h3>
                <ul className="space-y-2">
                  {awaiting.length === 0 && <li className="text-xs text-muted-foreground/60 italic py-2">No pending approvals.</li>}
                  {awaiting.map((t) => (
                    <li key={t.id} className="flex items-center justify-between text-xs p-3 rounded-lg bg-muted border border-border">
                      <span className="font-medium text-foreground truncate max-w-[200px]">{t.title}</span>
                      <div className="flex gap-1.5 shrink-0">
                        <form action={approveTask}>
                          <input type="hidden" name="id" value={t.id} />
                          <Button size="sm" className="h-7.5 px-2.5 text-[10px] font-semibold cursor-pointer active:scale-95">Approve</Button>
                        </form>
                        <form action={rejectTask}>
                          <input type="hidden" name="id" value={t.id} />
                          <Button size="sm" variant="outline" className="h-7.5 px-2.5 text-[10px] border-red-500/20 text-red-500 hover:bg-red-500/10 cursor-pointer active:scale-95">Deny</Button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 backdrop-blur-sm space-y-4 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4 text-indigo-500" />
                  <span>Available Windows (Next 7 Days)</span>
                </h3>
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  {windows.length === 0 && <li className="text-xs text-muted-foreground/60 italic py-2">No free windows found.</li>}
                  {windows.slice(0, 5).map((w, i) => (
                    <li key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted border border-border">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span>{fmtDate(w.start)} – {w.end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {isPrimary && !myWorkMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-5 backdrop-blur-sm space-y-4 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <span>AI Recommendations</span>
                </h3>
                {recommendation ? (
                  <p className="text-xs text-foreground leading-relaxed bg-muted p-3.5 rounded-lg border border-border animate-fade-up">
                    Smart-assign suggests <strong className="text-primary">{recommendation.name}</strong> for the next unassigned task due to lowest current active workload.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/60 italic py-2">No active members yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-5 backdrop-blur-sm space-y-4 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-sky-500" />
                  <span>Assign Manually</span>
                </h3>
                <ul className="space-y-2.5">
                  {unassigned.length === 0 && <li className="text-xs text-muted-foreground/60 italic py-2">All tasks have an assignee.</li>}
                  {unassigned.slice(0, 4).map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 text-xs p-3 rounded-lg bg-muted border border-border">
                      <span className="truncate text-foreground font-medium max-w-[150px]">{t.title}</span>
                      <form action={assignTask} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={t.id} />
                        <select
                          name="assigned_to"
                          className="h-8.5 rounded-lg border border-border bg-background text-xs px-2 text-foreground focus-visible:ring-1 focus-visible:ring-ring cursor-pointer shadow-sm"
                        >
                          <option value="">Pick…</option>
                          {sortedMembersForAssign.map((m) => (
                            <option key={m.user_id} value={m.user_id}>{nameOf(m.user_id)}</option>
                          ))}
                        </select>
                        <Button size="sm" className="h-8.5 text-[10px] font-semibold cursor-pointer active:scale-95">Assign</Button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
      </TasksAnimated>
    </div>
  );
}
