import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveWorkspace } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderOpen, Plus, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { DeleteProjectButton } from "@/components/projects/DeleteProjectButton";
import type { Tables } from "@/lib/supabase/types";

type Project = Tables<"projects">;

const ACCENT_PALETTE = [
  { bg: "from-indigo-500 to-violet-600",  border: "#6366f1", text: "text-indigo-600",  light: "bg-indigo-50",  hex: "#4f46e5" },
  { bg: "from-violet-500 to-purple-600",  border: "#7c3aed", text: "text-violet-600",  light: "bg-violet-50",  hex: "#7c3aed" },
  { bg: "from-emerald-500 to-teal-600",   border: "#059669", text: "text-emerald-600", light: "bg-emerald-50", hex: "#059669" },
  { bg: "from-orange-500 to-amber-600",   border: "#f97316", text: "text-orange-600",  light: "bg-orange-50",  hex: "#f97316" },
  { bg: "from-rose-500 to-pink-600",      border: "#f43f5e", text: "text-rose-600",    light: "bg-rose-50",    hex: "#f43f5e" },
  { bg: "from-sky-500 to-cyan-600",       border: "#0ea5e9", text: "text-sky-600",     light: "bg-sky-50",     hex: "#0ea5e9" },
];

const TEMPLATE_META: Record<string, { icon: string; label: string }> = {
  software: { icon: "💻", label: "Software" },
  agency:   { icon: "🏢", label: "Agency"   },
  ops:      { icon: "⚙️", label: "Ops"      },
  blank:    { icon: "📄", label: "Blank"    },
};

function accentFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

function StatusBadge({ status }: { status: Project["status"] }) {
  const map: Record<Project["status"], { label: string; className: string }> = {
    active:    { label: "Active",     className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
    archived:  { label: "Archived",   className: "bg-muted text-muted-foreground border border-border" },
    completed: { label: "Completed",  className: "bg-indigo-100 text-indigo-700 border border-indigo-200" },
  };
  const { label, className } = map[status] ?? map.active;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${className}`}>
      {label}
    </span>
  );
}

async function deleteProject(id: string) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "project.delete")) throw new Error("Forbidden");
  const supabase = await createSupabaseServerClient();
  await supabase.from("projects").delete().eq("id", id).eq("workspace_id", active.workspace.id);
  revalidatePath("/projects");
  redirect("/projects");
}

async function createProject(formData: FormData) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "project.create")) throw new Error("Forbidden");

  const supabase = await createSupabaseServerClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const { data: project } = await supabase
    .from("projects")
    .insert({
      workspace_id: active.workspace.id,
      name,
      description: String(formData.get("description") ?? "") || null,
      template: (String(formData.get("template") ?? "blank") as "software" | "agency" | "ops" | "blank"),
      status: "active",
      created_by: active.member.user_id,
    })
    .select("id")
    .single();

  revalidatePath("/projects");
  if (project?.id) redirect(`/projects/${project.id}`);
  else redirect("/projects");
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;
  const showNew = params.new === "1";

  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", active.workspace.id)
    .order("created_at", { ascending: false });

  const projectIds = (projects ?? []).map((p) => p.id);
  let totalCounts: Record<string, number> = {};
  let doneCounts: Record<string, number> = {};

  if (projectIds.length > 0) {
    const [{ data: totalRows }, { data: doneRows }] = await Promise.all([
      supabase.from("tasks").select("project_id").eq("workspace_id", active.workspace.id).in("project_id", projectIds),
      supabase.from("tasks").select("project_id").eq("workspace_id", active.workspace.id).in("project_id", projectIds).eq("status", "completed"),
    ]);

    for (const row of totalRows ?? []) {
      if (row.project_id) totalCounts[row.project_id] = (totalCounts[row.project_id] ?? 0) + 1;
    }
    for (const row of doneRows ?? []) {
      if (row.project_id) doneCounts[row.project_id] = (doneCounts[row.project_id] ?? 0) + 1;
    }
  }

  const canCreate = can(active.role, "project.create");
  const canDelete = can(active.role, "project.delete");
  const totalProjects = (projects ?? []).length;
  const activeProjects = (projects ?? []).filter((p) => p.status === "active").length;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {active.workspace.name} · {activeProjects} active · {totalProjects} total
          </p>
        </div>
        {canCreate && (
          <Link href="/projects?new=1">
            <Button className="flex items-center gap-2 shadow-md">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </Link>
        )}
      </header>

      {/* Creation form */}
      {showNew && canCreate && (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 animate-fade-up">
          <h2 className="text-base font-bold mb-5 flex items-center gap-2">
            <Plus className="h-4.5 w-4.5 text-indigo-500" />
            Create a new project
          </h2>
          <form action={createProject} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Project name *</Label>
                <Input id="name" name="name" placeholder="My new project" required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="template">Template</Label>
                <select
                  id="template"
                  name="template"
                  defaultValue="blank"
                  className="flex h-10 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <option value="blank">📄 Blank</option>
                  <option value="software">💻 Software</option>
                  <option value="agency">🏢 Agency</option>
                  <option value="ops">⚙️ Operations</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" placeholder="What is this project about?" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit">Create Project</Button>
              <Link href="/projects">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {(projects ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-5 shadow-sm">
            <FolderOpen className="h-10 w-10 text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">No projects yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Projects help you group related tasks, track progress, and keep your team aligned.
          </p>
          {canCreate && (
            <Link href="/projects?new=1">
              <Button className="shadow-md">
                <Plus className="h-4 w-4 mr-2" />
                Create your first project
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(projects ?? []).map((project, idx) => {
            const accent = accentFor(project.name);
            const total = totalCounts[project.id] ?? 0;
            const done = doneCounts[project.id] ?? 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const tmpl = TEMPLATE_META[project.template ?? "blank"] ?? TEMPLATE_META.blank;

            const boundDelete = deleteProject.bind(null, project.id);

            return (
              <div
                key={project.id}
                className="relative group animate-fade-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <Link href={`/projects/${project.id}`} className="block">
                  <div
                    className="rounded-2xl border bg-card shadow-sm card-hover overflow-hidden h-full flex flex-col transition-all"
                    style={{ borderLeftWidth: 4, borderLeftColor: accent.hex }}
                  >
                    {/* Card header */}
                    <div className={`bg-gradient-to-r ${accent.bg} px-5 py-4`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-0.5">
                            {tmpl.icon} {tmpl.label}
                          </p>
                          <h3 className="text-base font-bold text-white leading-snug truncate">
                            {project.name}
                          </h3>
                        </div>
                        <StatusBadge status={project.status} />
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="flex-1 flex flex-col gap-4 p-5">
                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {project.description}
                        </p>
                      )}

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            {done} / {total} tasks done
                          </span>
                          <span className="font-bold" style={{ color: accent.hex }}>{pct}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 border border-slate-200/50 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${accent.hex}cc, ${accent.hex})`,
                              boxShadow: `0 0 6px ${accent.hex}55`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                        <span className="flex items-center gap-1">
                          <Circle className="h-3 w-3" />
                          {total === 0 ? "No tasks" : `${total} task${total !== 1 ? "s" : ""}`}
                        </span>
                        <span className="flex items-center gap-1 group-hover:text-indigo-500 transition-colors font-semibold">
                          Open
                          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Delete button — visible on hover, manager+ only */}
                {canDelete && (
                  <DeleteProjectButton projectName={project.name} action={boundDelete} variant="icon" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
