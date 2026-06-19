import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveWorkspace } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ProjectBoard } from "@/components/projects/ProjectBoard";
import { AITaskSuggestions } from "@/components/projects/AITaskSuggestions";
import { ProjectRealtimeSync } from "@/components/projects/ProjectRealtimeSync";
import { DeleteProjectButton } from "@/components/projects/DeleteProjectButton";
import type { Tables } from "@/lib/supabase/types";

async function deleteThisProject(projectId: string) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "project.delete")) throw new Error("Forbidden");
  const supabase = await createSupabaseServerClient();
  await supabase.from("projects").delete().eq("id", projectId).eq("workspace_id", active.workspace.id);
  revalidatePath("/projects");
  redirect("/projects");
}

type Task = Tables<"tasks">;
type Project = Tables<"projects">;

function StatusBadge({ status }: { status: Project["status"] }) {
  const map: Record<Project["status"], { label: string; className: string }> = {
    active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
    archived: { label: "Archived", className: "bg-gray-100 text-gray-600" },
    completed: { label: "Completed", className: "bg-indigo-100 text-indigo-700" },
  };
  const { label, className } = map[status] ?? map.active;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-blue-100 text-blue-700",
  low: "bg-gray-100 text-gray-600",
};

const STATUS_COLORS: Record<Task["status"], string> = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  awaiting_approval: "bg-amber-100 text-amber-700",
  awaiting_acceptance: "bg-purple-100 text-purple-700",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ListView({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm p-8 text-center">
        <p className="text-sm text-muted-foreground">No tasks in this project yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assignee</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tasks.map((task) => (
            <tr key={task.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 font-medium max-w-xs truncate">{task.title}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[task.status]}`}>
                  {task.status.replace(/_/g, " ")}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </span>
              </td>
              <td className="px-4 py-3">
                {(task as any).assignee ? (
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                      {(task as any).assignee.first_name[0]}{(task as any).assignee.last_name[0]}
                    </span>
                    <span className="text-xs font-medium">{(task as any).assignee.first_name} {(task as any).assignee.last_name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(task.due_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalendarView({ tasks }: { tasks: Task[] }) {
  // Group tasks by date
  const byDate: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (task.due_date) {
      const date = task.due_date.slice(0, 10);
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(task);
    }
  }

  const sortedDates = Object.keys(byDate).sort();
  const noDate = tasks.filter((t) => !t.due_date);

  return (
    <div className="space-y-4">
      {sortedDates.length === 0 && noDate.length === 0 && (
        <div className="rounded-xl border border-border bg-card shadow-sm p-8 text-center">
          <p className="text-sm text-muted-foreground">No tasks with due dates.</p>
        </div>
      )}
      {sortedDates.map((date) => (
        <div key={date} className="rounded-xl border border-border bg-card shadow-sm p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            })}
          </h3>
          <ul className="space-y-2">
            {byDate[date].map((task) => (
              <li key={task.id} className="flex items-center gap-2 text-sm">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[task.status]}`}>
                  {task.status.replace(/_/g, " ")}
                </span>
                <span className="font-medium truncate">{task.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {noDate.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-sm p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">No due date</h3>
          <ul className="space-y-2">
            {noDate.map((task) => (
              <li key={task.id} className="flex items-center gap-2 text-sm">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[task.status]}`}>
                  {task.status.replace(/_/g, " ")}
                </span>
                <span className="font-medium truncate">{task.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const view = (sp.view as "board" | "list" | "calendar") ?? "board";

  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", active.workspace.id)
    .maybeSingle();

  if (!project) notFound();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!assigned_to(first_name, last_name)")
    .eq("workspace_id", active.workspace.id)
    .eq("project_id", id)
    .order("position", { ascending: true });

  const allTasks = (tasks ?? []) as unknown as (Task & { assignee?: { first_name: string, last_name: string } | null })[];

  const tabClass = (tab: string) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      view === tab
        ? "bg-indigo-600 text-white"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  return (
    <div className="p-6 space-y-6 max-w-full">
      <ProjectRealtimeSync projectId={id} />
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Projects
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground max-w-xl">{project.description}</p>
          )}
        </div>

        {/* Right side: AI suggestions + delete */}
        <div className="flex items-center gap-2 shrink-0">
          {view === "board" && (
            <AITaskSuggestions
              projectName={project.name}
              existingTaskTitles={allTasks.map((t) => t.title)}
              workspaceId={active.workspace.id}
              projectId={id}
            />
          )}
          {can(active.role, "project.delete") && (
            <DeleteProjectButton
              projectName={project.name}
              action={deleteThisProject.bind(null, id)}
              variant="button"
            />
          )}
        </div>
      </div>

      {/* View switcher */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-fit">
        <Link href={`/projects/${id}?view=board`} className={tabClass("board")}>Board</Link>
        <Link href={`/projects/${id}?view=list`} className={tabClass("list")}>List</Link>
        <Link href={`/projects/${id}?view=calendar`} className={tabClass("calendar")}>Calendar</Link>
      </div>

      {/* Views */}
      {view === "board" && (
        <ProjectBoard
          tasks={allTasks}
          workspaceId={active.workspace.id}
          projectId={id}
          currentUserId={active.member.user_id}
          role={active.role}
        />
      )}

      {view === "list" && <ListView tasks={allTasks} />}

      {view === "calendar" && <CalendarView tasks={allTasks} />}
    </div>
  );
}
