import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { can } from "@/lib/auth/permissions";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ProjectBoard } from "@/components/projects/ProjectBoard";
import { AITaskSuggestions } from "@/components/projects/AITaskSuggestions";
import { ProjectRealtimeSync } from "@/components/projects/ProjectRealtimeSync";
import { DeleteProjectButton } from "@/components/projects/DeleteProjectButton";
import {
  CheckCircle2, AlertTriangle, LayoutGrid, List, Calendar,
  BarChart2, Edit2, Archive, Flag, Users, Activity,
  CalendarDays, UserPlus, UserMinus, X,
} from "lucide-react";
import type { Tables } from "@/lib/supabase/types";

type Task = Tables<"tasks">;
type Project = Tables<"projects">;

const ACCENT_PALETTE = [
  { bg: "from-indigo-500 to-violet-600",  hex: "#4f46e5" },
  { bg: "from-violet-500 to-purple-600",  hex: "#7c3aed" },
  { bg: "from-emerald-500 to-teal-600",   hex: "#059669" },
  { bg: "from-orange-500 to-amber-600",   hex: "#f97316" },
  { bg: "from-rose-500 to-pink-600",      hex: "#f43f5e" },
  { bg: "from-sky-500 to-cyan-600",       hex: "#0ea5e9" },
];
const AVATAR_COLORS = ["#6366f1","#7c3aed","#059669","#f97316","#f43f5e","#0ea5e9"];

function accentFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

const PRIORITY_COLORS: Record<Task["priority"], { dot: string; badge: string }> = {
  urgent: { dot: "bg-red-500",    badge: "bg-red-100 text-red-700" },
  high:   { dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700" },
  normal: { dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700" },
  low:    { dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-600" },
};

const STATUS_COLORS: Record<Task["status"], string> = {
  pending:              "bg-gray-100 text-gray-600",
  in_progress:          "bg-indigo-100 text-indigo-700",
  completed:            "bg-emerald-100 text-emerald-700",
  cancelled:            "bg-red-100 text-red-700",
  awaiting_approval:    "bg-amber-100 text-amber-700",
  awaiting_acceptance:  "bg-purple-100 text-purple-700",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(d: string | null) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── server actions ──────────────────────────────────────────────────────────
async function updateProject(formData: FormData) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "project.update")) throw new Error("Forbidden");
  const supabase = await createSupabaseServerClient();
  const pid = String(formData.get("project_id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const deadline = String(formData.get("deadline") ?? "") || null;
  await supabase.from("projects").update({
    name,
    description: String(formData.get("description") ?? "") || null,
    status: String(formData.get("status")) as any,
    deadline,
  } as any).eq("id", pid).eq("workspace_id", active.workspace.id);
  revalidatePath(`/projects/${pid}`);
  revalidatePath("/projects");
}

async function addProjectMember(formData: FormData) {
  "use server";
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  if (!can(active.role, "project.update")) throw new Error("Forbidden");
  const supabase = await createSupabaseServerClient();
  const pid = String(formData.get("project_id"));
  const userId = String(formData.get("user_id"));
  if (!userId || !pid) return;

  await supabaseAdmin.from("project_members").upsert({
    project_id: pid,
    user_id: userId,
    role: "member",
  }, { onConflict: "project_id,user_id" });

  // Get project name for notification
  const { data: project } = await supabase.from("projects").select("name").eq("id", pid).maybeSingle();
  const { data: creatorProfile } = await supabase.from("profiles").select("first_name, last_name").eq("id", user.id).maybeSingle();
  const creatorName = creatorProfile ? `${creatorProfile.first_name} ${creatorProfile.last_name}`.trim() : "A manager";

  try {
    await supabaseAdmin.from("notifications").insert({
      workspace_id: active.workspace.id,
      user_id: userId,
      type: "task_assignment",
      title: `Added to project: ${project?.name ?? ""}`,
      body: `${creatorName} added you to the project "${project?.name ?? ""}".`,
    });
  } catch { /* non-critical */ }

  revalidatePath(`/projects/${pid}`);
}

async function removeProjectMember(formData: FormData) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "project.update")) throw new Error("Forbidden");
  const pid = String(formData.get("project_id"));
  const userId = String(formData.get("user_id"));
  await supabaseAdmin.from("project_members")
    .delete()
    .eq("project_id", pid)
    .eq("user_id", userId);
  revalidatePath(`/projects/${pid}`);
}

async function deleteThisProject(projectId: string) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "project.delete")) throw new Error("Forbidden");
  const supabase = await createSupabaseServerClient();
  await supabase.from("projects").delete().eq("id", projectId).eq("workspace_id", active.workspace.id);
  revalidatePath("/projects");
  redirect("/projects");
}

// ── sub-views ───────────────────────────────────────────────────────────────
function ListView({ tasks }: { tasks: (Task & { assignee?: { first_name: string; last_name: string } | null })[] }) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.60)" }}>
        <p className="text-sm text-muted-foreground">No tasks in this project yet.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.50)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.65)", boxShadow: "0 2px 16px rgba(100,140,180,0.10), inset 0 1px 0 rgba(255,255,255,0.80)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.30)", borderBottom: "1px solid rgba(200,220,235,0.60)" }}>
            {["Title","Status","Priority","Assignee","Due date"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, i) => {
            const pc = PRIORITY_COLORS[task.priority];
            return (
              <tr key={task.id} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.15)", borderBottom: "1px solid rgba(200,220,235,0.40)" }}>
                <td className="px-4 py-3 font-medium max-w-xs">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${pc.dot}`} />
                    <span className="truncate">{task.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[task.status]}`}>{task.status.replace(/_/g, " ")}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${pc.badge}`}>{task.priority}</span>
                </td>
                <td className="px-4 py-3">
                  {(task as any).assignee ? (
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                        {(task as any).assignee.first_name[0]}{(task as any).assignee.last_name[0]}
                      </span>
                      <span className="text-xs">{(task as any).assignee.first_name} {(task as any).assignee.last_name}</span>
                    </div>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(task.due_date)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CalendarView({ tasks }: { tasks: Task[] }) {
  const byDate: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (task.due_date) {
      const date = task.due_date.slice(0, 10);
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(task);
    }
  }
  const sortedDates = Object.keys(byDate).sort();
  const noDate = tasks.filter(t => !t.due_date);

  if (sortedDates.length === 0 && noDate.length === 0) {
    return <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.60)" }}><p className="text-sm text-muted-foreground">No tasks with due dates.</p></div>;
  }

  return (
    <div className="space-y-4">
      {sortedDates.map(date => (
        <div key={date} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.65)", boxShadow: "0 2px 12px rgba(100,140,180,0.08), inset 0 1px 0 rgba(255,255,255,0.80)" }}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h3>
          <ul className="space-y-2">
            {byDate[date].map(task => (
              <li key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 border border-white/80">
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority].dot}`} />
                <span className="text-xs font-medium truncate flex-1">{task.title}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[task.status]}`}>{task.status.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {noDate.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.40)", border: "1px solid rgba(255,255,255,0.55)" }}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">No due date</h3>
          <ul className="space-y-2">
            {noDate.map(task => (
              <li key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/50 border border-white/60">
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority].dot}`} />
                <span className="text-xs font-medium truncate flex-1">{task.title}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[task.status]}`}>{task.status.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── page ────────────────────────────────────────────────────────────────────
export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; edit?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const view = (sp.view as "overview" | "board" | "list" | "calendar") ?? "overview";
  const editing = sp.edit === "1";

  const user = await requireUser();
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  const { data: project } = await supabase
    .from("projects").select("*").eq("id", id).eq("workspace_id", active.workspace.id).maybeSingle();
  if (!project) notFound();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!assigned_to(first_name, last_name)")
    .eq("workspace_id", active.workspace.id)
    .eq("project_id", id)
    .order("position", { ascending: true });

  const allTasks = (tasks ?? []) as unknown as (Task & { assignee?: { first_name: string; last_name: string } | null })[];

  // Real project members from project_members table
  const { data: pmRows } = await supabase
    .from("project_members")
    .select("user_id, role, added_at, profiles!project_members_user_id_fkey(first_name, last_name, avatar_url)")
    .eq("project_id", id);

  const projectMembers = (pmRows ?? []).map((row: any) => ({
    userId: row.user_id as string,
    role: row.role as string,
    addedAt: row.added_at as string,
    name: `${row.profiles?.first_name ?? ""} ${row.profiles?.last_name ?? ""}`.trim(),
    initials: ((row.profiles?.first_name?.[0] ?? "") + (row.profiles?.last_name?.[0] ?? "")).toUpperCase(),
    avatarUrl: row.profiles?.avatar_url as string | null,
  }));

  const memberUserIds = new Set(projectMembers.map(m => m.userId));

  // Workspace members NOT yet in this project (for add-member dropdown)
  const { data: wsMemberRows } = await supabase
    .from("workspace_members")
    .select("user_id, role, profiles!workspace_members_user_id_profiles_fkey(first_name, last_name)")
    .eq("workspace_id", active.workspace.id)
    .eq("status", "active");

  const nonMembers = (wsMemberRows ?? [])
    .filter((m: any) => !memberUserIds.has(m.user_id))
    .map((m: any) => ({
      userId: m.user_id as string,
      role: m.role as string,
      name: `${m.profiles?.first_name ?? ""} ${m.profiles?.last_name ?? ""}`.trim(),
      initials: ((m.profiles?.first_name?.[0] ?? "") + (m.profiles?.last_name?.[0] ?? "")).toUpperCase(),
    }));

  // Stats
  const today = new Date().toISOString().slice(0, 10);
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter(t => t.status === "completed").length;
  const inProgressTasks = allTasks.filter(t => t.status === "in_progress").length;
  const overdueTasks = allTasks.filter(t => t.due_date && t.due_date.slice(0,10) < today && t.status !== "completed" && t.status !== "cancelled").length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Deadline
  const deadline = (project as any).deadline as string | null;
  const isDeadlineOverdue = deadline && deadline < today && project.status !== "completed";

  const recentActivity = [...allTasks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  // Task counts per member
  const memberTaskCount: Record<string, number> = {};
  for (const task of allTasks) {
    const assignedTo = (task as any).assigned_to;
    if (assignedTo) memberTaskCount[assignedTo] = (memberTaskCount[assignedTo] ?? 0) + 1;
  }

  const tasksWithDates = allTasks.filter(t => t.due_date).length;
  const accent = accentFor(project.name);
  const canManage = can(active.role, "project.update");
  const canDelete = can(active.role, "project.delete");

  const tabClass = (tab: string) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${view === tab ? "bg-white text-indigo-600 shadow-sm" : "text-muted-foreground hover:text-foreground"}`;

  const ROLE_COLORS: Record<string, string> = {
    owner: "bg-indigo-100 text-indigo-700",
    admin: "bg-violet-100 text-violet-700",
    manager: "bg-blue-100 text-blue-700",
    member: "bg-slate-100 text-slate-600",
    guest: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="p-6 space-y-6 max-w-full animate-fade-up">
      <ProjectRealtimeSync projectId={id} />

      {/* ── Gradient header banner ── */}
      <div className={`rounded-2xl bg-gradient-to-r ${accent.bg} p-5 relative overflow-hidden`} style={{ boxShadow: `0 4px 24px ${accent.hex}30` }}>
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />

        {/* Breadcrumb */}
        <div className="relative flex items-center gap-2 text-white/70 text-xs font-medium mb-3">
          <Link href="/projects" className="hover:text-white transition-colors">Projects</Link>
          <span>/</span>
          <span className="text-white font-bold">{project.name}</span>
          <span className={`ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${project.status === "active" ? "bg-white/20 text-white" : project.status === "completed" ? "bg-indigo-900/30 text-white" : "bg-black/20 text-white/70"}`}>
            {project.status}
          </span>
        </div>

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editing && canManage ? (
              <form action={updateProject} className="space-y-3">
                <input type="hidden" name="project_id" value={id} />
                <div className="flex gap-2 flex-wrap">
                  <input name="name" defaultValue={project.name} autoFocus className="rounded-xl px-3 py-1.5 text-sm font-bold bg-white/20 border border-white/40 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/60 min-w-[200px]" />
                  <input name="deadline" type="date" defaultValue={deadline ?? ""} className="rounded-xl px-3 py-1.5 text-xs bg-white/20 border border-white/40 text-white focus:outline-none focus:ring-2 focus:ring-white/60" />
                  <select name="status" defaultValue={project.status} className="rounded-xl px-3 py-1.5 text-xs font-bold bg-white/20 border border-white/40 text-white focus:outline-none focus:ring-2 focus:ring-white/60">
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <input name="description" defaultValue={(project as any).description ?? ""} placeholder="Project description…" className="w-full rounded-xl px-3 py-1.5 text-xs bg-white/20 border border-white/40 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/60" />
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-1.5 rounded-xl bg-white text-indigo-700 text-xs font-bold hover:bg-white/90 transition-colors">Save</button>
                  <Link href={`/projects/${id}?view=${view}`}><button type="button" className="px-4 py-1.5 rounded-xl bg-white/20 text-white text-xs font-bold hover:bg-white/30 transition-colors border border-white/30">Cancel</button></Link>
                </div>
              </form>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-white truncate">{project.name}</h1>
                {(project as any).description && <p className="text-sm text-white/70 mt-1 max-w-xl">{(project as any).description}</p>}
                {/* Deadline display */}
                {deadline && (
                  <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${isDeadlineOverdue ? "bg-red-500/30 text-red-100" : "bg-white/20 text-white/90"}`}>
                    <CalendarDays className="h-3 w-3" />
                    {isDeadlineOverdue ? "OVERDUE · " : "Due "}
                    {new Date(deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action buttons */}
          {!editing && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {canManage && (
                <Link href={`/projects/${id}?view=${view}&edit=1`}>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 border border-white/30 text-white text-xs font-semibold hover:bg-white/30 transition-colors">
                    <Edit2 className="h-3.5 w-3.5" />Edit
                  </button>
                </Link>
              )}
              {view === "board" && (
                <AITaskSuggestions projectName={project.name} existingTaskTitles={allTasks.map(t => t.title)} workspaceId={active.workspace.id} projectId={id} />
              )}
              {canDelete && (
                <DeleteProjectButton projectName={project.name} action={deleteThisProject.bind(null, id)} variant="button" />
              )}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {totalTasks > 0 && (
          <div className="relative mt-4 space-y-1">
            <div className="flex justify-between text-[11px] text-white/70 font-medium">
              <span>{doneTasks} of {totalTasks} tasks completed</span>
              <span className="font-bold text-white">{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${pct}%`, boxShadow: "0 0 8px rgba(255,255,255,0.5)" }} />
            </div>
          </div>
        )}
      </div>

      {/* ── View tabs ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.60)" }}>
        <Link href={`/projects/${id}?view=overview`} className={tabClass("overview")}><BarChart2 className="h-3.5 w-3.5" />Overview</Link>
        <Link href={`/projects/${id}?view=board`} className={tabClass("board")}>
          <LayoutGrid className="h-3.5 w-3.5" />Board
          {totalTasks > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600">{totalTasks}</span>}
        </Link>
        <Link href={`/projects/${id}?view=list`} className={tabClass("list")}><List className="h-3.5 w-3.5" />List</Link>
        <Link href={`/projects/${id}?view=calendar`} className={tabClass("calendar")}>
          <Calendar className="h-3.5 w-3.5" />Calendar
          {tasksWithDates > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600">{tasksWithDates}</span>}
        </Link>
      </div>

      {/* ── Overview tab ── */}
      {view === "overview" && (
        <div className="space-y-6 animate-fade-up">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />, label: "Done", value: doneTasks, bg: "bg-emerald-50", sub: `${pct}% complete` },
              { icon: <Activity className="h-5 w-5 text-indigo-500" />, label: "In Progress", value: inProgressTasks, bg: "bg-indigo-50", sub: "active tasks" },
              { icon: <AlertTriangle className="h-5 w-5 text-red-500" />, label: "Overdue", value: overdueTasks, bg: "bg-red-50", sub: "need attention" },
              { icon: <Flag className="h-5 w-5 text-slate-400" />, label: "Total Tasks", value: totalTasks, bg: "bg-slate-50", sub: "in this project" },
            ].map(({ icon, label, value, bg, sub }) => (
              <div key={label} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.60)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.70)", boxShadow: "0 2px 12px rgba(100,140,180,0.08), inset 0 1px 0 rgba(255,255,255,0.80)" }}>
                <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
                <div>
                  <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
                  <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{label}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent activity */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.65)", boxShadow: "0 2px 16px rgba(100,140,180,0.08), inset 0 1px 0 rgba(255,255,255,0.80)" }}>
              <h2 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
                <div className="h-6 w-6 rounded-lg bg-indigo-100 flex items-center justify-center"><Activity className="h-3.5 w-3.5 text-indigo-600" /></div>
                Recent Activity
              </h2>
              {recentActivity.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No recent activity.</p>
              ) : (
                <ul className="space-y-2">
                  {recentActivity.map(task => (
                    <li key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 border border-white/80">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority].dot}`} />
                      <span className="text-xs font-medium flex-1 truncate" style={{ color: "var(--text-body)" }}>{task.title}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status]}`}>{task.status.replace(/_/g, " ")}</span>
                      <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>{timeAgo(task.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Project team — real project_members */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.65)", boxShadow: "0 2px 16px rgba(100,140,180,0.08), inset 0 1px 0 rgba(255,255,255,0.80)" }}>
              <h2 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
                <div className="h-6 w-6 rounded-lg bg-violet-100 flex items-center justify-center"><Users className="h-3.5 w-3.5 text-violet-600" /></div>
                Project Team
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">{projectMembers.length}</span>
              </h2>

              {projectMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No members assigned yet.</p>
              ) : (
                <ul className="space-y-2 mb-4">
                  {projectMembers.map((m, i) => (
                    <li key={m.userId} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 border border-white/80">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                        {m.initials || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-body)" }}>{m.name}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${ROLE_COLORS[m.role] ?? ROLE_COLORS.member}`}>{m.role}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: accent.hex + "18", color: accent.hex, border: `1px solid ${accent.hex}28` }}>
                        {memberTaskCount[m.userId] ?? 0} task{(memberTaskCount[m.userId] ?? 0) !== 1 ? "s" : ""}
                      </span>
                      {/* Remove member button — manager+ only, can't remove owner */}
                      {canManage && m.role !== "owner" && (
                        <form action={removeProjectMember}>
                          <input type="hidden" name="project_id" value={id} />
                          <input type="hidden" name="user_id" value={m.userId} />
                          <button type="submit" className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 text-muted-foreground/40 transition-colors" title="Remove from project">
                            <X className="h-3 w-3" />
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/* Add member — manager+ only, only if there are non-members */}
              {canManage && nonMembers.length > 0 && (
                <form action={addProjectMember} className="flex gap-2">
                  <input type="hidden" name="project_id" value={id} />
                  <select name="user_id" className="flex-1 rounded-xl border border-border bg-white/60 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select teammate to add…</option>
                    {nonMembers.map(m => (
                      <option key={m.userId} value={m.userId}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                  <button type="submit" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-colors" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 2px 8px rgba(99,102,241,0.25)" }}>
                    <UserPlus className="h-3.5 w-3.5" />Add
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3">
            <Link href={`/projects/${id}?view=board`}>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors border" style={{ background: accent.hex + "12", color: accent.hex, borderColor: accent.hex + "28" }}>
                <LayoutGrid className="h-3.5 w-3.5" />Open Board
              </button>
            </Link>
            {canManage && (
              <>
                <Link href={`/projects/${id}?view=overview&edit=1`}>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/60 border border-white/70 hover:bg-white/80 transition-colors text-slate-600">
                    <Edit2 className="h-3.5 w-3.5" />Edit Project
                  </button>
                </Link>
                {project.status === "active" && (
                  <form action={updateProject}>
                    <input type="hidden" name="project_id" value={id} />
                    <input type="hidden" name="name" value={project.name} />
                    <input type="hidden" name="description" value={(project as any).description ?? ""} />
                    <input type="hidden" name="status" value="completed" />
                    <input type="hidden" name="deadline" value={deadline ?? ""} />
                    <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />Mark Complete
                    </button>
                  </form>
                )}
                {project.status !== "archived" && (
                  <form action={updateProject}>
                    <input type="hidden" name="project_id" value={id} />
                    <input type="hidden" name="name" value={project.name} />
                    <input type="hidden" name="description" value={(project as any).description ?? ""} />
                    <input type="hidden" name="status" value="archived" />
                    <input type="hidden" name="deadline" value={deadline ?? ""} />
                    <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/60 border border-white/70 hover:bg-white/80 transition-colors text-slate-500">
                      <Archive className="h-3.5 w-3.5" />Archive
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {view === "board" && <ProjectBoard tasks={allTasks} workspaceId={active.workspace.id} projectId={id} currentUserId={active.member.user_id} role={active.role} />}
      {view === "list" && <ListView tasks={allTasks} />}
      {view === "calendar" && <CalendarView tasks={allTasks} />}
    </div>
  );
}
