import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Calendar, Clock, Flag, User2, AlignLeft, Sparkles, Pencil, CalendarPlus, CheckCircle2, X } from "lucide-react";
import type { Tables, TaskPriority, TaskStatus } from "@/lib/supabase/types";
import { AIDraftDescription, AISuggestDueDate, AISummarizeComments } from "@/components/tasks/AITaskActions";
import { BackButton } from "@/components/ui/BackButton";
import { SubmitButton } from "@/components/ui/submit-button";
import { TasksRealtimeSync } from "@/components/tasks/TasksRealtimeSync";

const STATUS_COLOUR: Record<TaskStatus, string> = {
  pending:              "bg-slate-50 text-slate-600 border border-border",
  in_progress:          "bg-amber-50 text-amber-600 border border-amber-200",
  completed:            "bg-emerald-50 text-emerald-600 border border-emerald-200",
  cancelled:            "bg-red-50 text-red-650 border border-red-200",
  awaiting_approval:    "bg-orange-50 text-orange-600 border border-orange-200",
  awaiting_acceptance:  "bg-indigo-50 text-indigo-600 border border-indigo-200",
};

const PRIORITY_COLOUR: Record<TaskPriority, string> = {
  low:    "bg-zinc-50 text-zinc-650 border border-border",
  normal: "bg-indigo-50 text-indigo-600 border border-indigo-200",
  high:   "bg-orange-50 text-orange-655 border border-orange-200",
  urgent: "bg-red-50 text-red-655 border border-red-200 shadow-sm animate-pulse-soft",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

async function createCalendarEventForTask(taskId: string, taskTitle: string, formData: FormData) {
  "use server";
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  const date      = String(formData.get("date") ?? "");
  const startTime = String(formData.get("start_time") ?? "");
  const endTime   = String(formData.get("end_time") ?? "");
  const title     = String(formData.get("title") ?? taskTitle).trim() || taskTitle;

  if (!date || !startTime || !endTime) return;

  const { error } = await supabase.from("calendar_events").insert({
    workspace_id: active.workspace.id,
    owner_id:     user.id,
    title,
    event_type:   "task_block",
    start_at:     `${date}T${startTime}`,
    end_at:       `${date}T${endTime}`,
    task_id:      taskId,
    is_team:      false,
  });

  if (error) throw new Error("Failed to create calendar event");

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/calendar");
  redirect(`/tasks/${taskId}?calendar=1`);
}

import { assignTask, respondToTaskAction } from "@/lib/tasks/mutations";

async function assignTaskOnDetailPage(taskId: string, formData: FormData) {
  "use server";
  await assignTask(formData);
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  redirect(`/tasks/${taskId}`);
}


async function updateTaskPriority(taskId: string, formData: FormData) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "task.prioritize")) throw new Error("Forbidden");

  const newPriority = String(formData.get("priority") ?? "normal") as TaskPriority;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("tasks")
    .update({ priority: newPriority })
    .eq("id", taskId)
    .eq("workspace_id", active.workspace.id);

  revalidatePath(`/tasks/${taskId}`);
  redirect(`/tasks/${taskId}`);
}

export default async function TaskDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ calendar?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const calendarAdded = sp.calendar === "1";
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assigned_to_profiles_fkey(first_name, last_name)")
    .eq("id", id)
    .eq("workspace_id", active.workspace.id)
    .single();

  if (!task) notFound();

  const t = task as unknown as Tables<"tasks"> & {
    assignee?: { first_name: string | null; last_name: string | null } | null;
  };

  const assigneeName = t.assignee
    ? [t.assignee.first_name, t.assignee.last_name].filter(Boolean).join(" ") || "Member"
    : null;

  const { data: commentsData } = await supabase
    .from("task_comments")
    .select("body")
    .eq("task_id", id)
    .order("created_at", { ascending: true });

  const commentBodies = (commentsData ?? []).map((c) => c.body).filter(Boolean) as string[];
  const canPrioritize = can(active.role, "task.prioritize");
  const canAssign = can(active.role, "task.assign");

  const updatePriority = updateTaskPriority.bind(null, id);
  const addToCalendar  = createCalendarEventForTask.bind(null, id, t.title);
  const assignTaskOnDetail = assignTaskOnDetailPage.bind(null, id);
  const acceptTaskAction = respondToTaskAction.bind(null, id, null, "accept");
  const declineTaskAction = respondToTaskAction.bind(null, id, null, "decline");

  const isAssignee = t.assigned_to === user.id;
  const isAwaitingAcceptance = t.status === "awaiting_acceptance";

  // Fetch workspace members for assignment dropdown
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
    .map((m) => ({ id: m.user_id, name: nameOf(m.user_id) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const todayStr = new Date().toISOString().slice(0, 10);
  const dueDateStr = t.due_date ? new Date(t.due_date).toISOString().slice(0, 10) : todayStr;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <TasksRealtimeSync workspaceId={active.workspace.id} userId={user.id} />
      <BackButton />

      {calendarAdded && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-semibold shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <span className="text-lg">✅</span>
          Calendar block added successfully! You can view it in{" "}
          <a href="/calendar" className="underline underline-offset-2 hover:text-emerald-800">My Calendar</a>.
        </div>
      )}


      <div className="rounded-2xl bg-card border border-border shadow-md overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse-soft" />

        <div className="px-6 py-6 border-b border-border bg-slate-50/50">
          <div className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground mb-1 select-none">
            {"TK-" + t.id.slice(0, 4).toUpperCase()}
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-tight text-foreground">{t.title}</h1>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${STATUS_COLOUR[t.status as TaskStatus]}`}>
              {t.status.replace(/_/g, " ")}
            </span>

            {/* Priority badge — editable for managers+ */}
            {canPrioritize ? (
              <form action={updatePriority} className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${PRIORITY_COLOUR[t.priority as TaskPriority]}`}>
                  <Flag className="inline h-3 w-3 mr-1 mt-[-2px]" />
                  {t.priority}
                </span>
                <select
                  name="priority"
                  defaultValue={t.priority}
                  className="text-[10px] font-bold rounded-lg border border-border bg-card px-2 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50"
                  title="Select priority to save"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <button type="submit" className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm ml-1">
                  Save
                </button>
              </form>
            ) : (
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${PRIORITY_COLOUR[t.priority as TaskPriority]}`}>
                <Flag className="inline h-3 w-3 mr-1 mt-[-2px]" />
                {t.priority}
              </span>
            )}
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Accept / Decline Banner */}
          {isAwaitingAcceptance && isAssignee && (
            <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in mb-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-indigo-700 block">Task Assignment Request</span>
                <p className="text-xs text-indigo-600/90 leading-relaxed">This task has been assigned to you. Please accept or decline the assignment.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <form action={acceptTaskAction}>
                  <SubmitButton className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-sm active:scale-95 border-none h-auto">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                  </SubmitButton>
                </form>
                <form action={declineTaskAction}>
                  <SubmitButton variant="outline" className="flex items-center gap-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2 text-xs font-bold transition-all active:scale-95 h-auto">
                    <X className="h-3.5 w-3.5" /> Decline
                  </SubmitButton>
                </form>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="flex gap-3 items-start">
            <AlignLeft className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Description</div>
              {t.description ? (
                <p className="text-sm text-foreground leading-relaxed bg-slate-50 p-4 rounded-xl border border-border">
                  {t.description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic bg-slate-50 p-3 rounded-lg border border-dashed border-border">
                  No description specified yet.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
            <div className="flex gap-2.5 items-start">
              <Calendar className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Due Date</div>
                <div className="text-sm text-foreground font-semibold">{fmtDate(t.due_date)}</div>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <Clock className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Start Date</div>
                <div className="text-sm text-foreground font-semibold">{fmtDate(t.start_at)}</div>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <User2 className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned To</div>
                {canAssign ? (
                  <form action={assignTaskOnDetail} className="flex items-center gap-2 mt-1">
                    <input type="hidden" name="id" value={id} />
                    <select
                      name="assigned_to"
                      defaultValue={t.assigned_to ?? ""}
                      className="text-xs rounded-lg border border-border bg-card px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50 font-semibold text-foreground"
                    >
                      <option value="">Unassigned</option>
                      {memberOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <SubmitButton className="h-7 text-[10px] uppercase font-bold bg-primary text-primary-foreground px-3 py-1 rounded-lg hover:bg-primary/90 transition-colors shadow-sm border-none ml-2">
                      Save
                    </SubmitButton>
                  </form>
                ) : (
                  <div className="text-sm text-foreground font-semibold flex items-center gap-2 mt-1">
                    {assigneeName ? (
                      <>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-650 text-[9px] font-bold">
                          {assigneeName.slice(0, 2).toUpperCase()}
                        </span>
                        {assigneeName}
                      </>
                    ) : (
                      <span className="text-muted-foreground italic">Unassigned</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <Calendar className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Created</div>
                <div className="text-sm text-foreground font-semibold">{fmtDate(t.created_at)}</div>
              </div>
            </div>
          </div>

          {t.requires_approval && (
            <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3.5 text-xs text-orange-655 font-semibold animate-pulse-soft">
              ⚠️ Regulated Workflow: This task requires manual manager approval before progress can commence.
            </div>
          )}
        </div>
      </div>

      {/* ── Block time on Calendar ── */}
      <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-slate-50/60 overflow-hidden shadow-sm">
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <CalendarPlus className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-indigo-700">Block time on Calendar</span>
              <p className="text-[10px] text-indigo-500/80">Schedule a focused work session linked to this task</p>
            </div>
          </div>

          <form action={addToCalendar} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Title</label>
              <input
                name="title"
                defaultValue={t.title}
                placeholder="Session title"
                className="w-full h-9 rounded-xl border border-white/80 bg-white/70 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Date</label>
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={dueDateStr}
                  className="w-full h-9 rounded-xl border border-white/80 bg-white/70 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Start</label>
                <input
                  name="start_time"
                  type="time"
                  required
                  defaultValue="09:00"
                  className="w-full h-9 rounded-xl border border-white/80 bg-white/70 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">End</label>
                <input
                  name="end_time"
                  type="time"
                  required
                  defaultValue="10:00"
                  className="w-full h-9 rounded-xl border border-white/80 bg-white/70 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>
            <SubmitButton
              className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98] border-none"
            >
              <CalendarPlus className="h-4 w-4" />
              Add to Calendar
            </SubmitButton>
          </form>
        </div>
      </div>

      {/* ── Chrona Nexus PRO ── */}
      <div className="rounded-2xl border border-violet-200/60 dark:border-violet-500/20 bg-gradient-to-br from-violet-50/80 to-indigo-50/60 dark:from-violet-950/30 dark:to-indigo-950/20 overflow-hidden shadow-sm">
        {/* Top accent strip */}
        <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500" />

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-white/20">
              <Sparkles className="h-5 w-5 text-white drop-shadow-md" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">Chrona Nexus</span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white tracking-wide shadow-sm">
                  PRO
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                AI-powered task intelligence — draft, suggest, and summarise in one click
              </p>
            </div>
          </div>

          {/* AI Actions */}
          <div className="space-y-3">
            <AIDraftDescription title={t.title} />
            <AISuggestDueDate title={t.title} priority={t.priority} />
            {commentBodies.length > 0 && <AISummarizeComments commentBodies={commentBodies} />}
          </div>
        </div>
      </div>
    </div>
  );
}
