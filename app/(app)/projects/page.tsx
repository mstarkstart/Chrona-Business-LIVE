import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { can } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FolderOpen, Plus, ArrowRight, CheckCircle2, Circle,
  Layers, Activity, Users, X, CalendarDays, Check,
} from "lucide-react";
import type { Tables } from "@/lib/supabase/types";

type Project = Tables<"projects">;

const ACCENT_PALETTE = [
  { bg: "from-indigo-500 to-violet-600",  hex: "#4f46e5" },
  { bg: "from-violet-500 to-purple-600",  hex: "#7c3aed" },
  { bg: "from-emerald-500 to-teal-600",   hex: "#059669" },
  { bg: "from-orange-500 to-amber-600",   hex: "#f97316" },
  { bg: "from-rose-500 to-pink-600",      hex: "#f43f5e" },
  { bg: "from-sky-500 to-cyan-600",       hex: "#0ea5e9" },
];

const TEMPLATE_META: Record<string, { icon: string; label: string }> = {
  software: { icon: "💻", label: "Software" },
  agency:   { icon: "🏢", label: "Agency"   },
  ops:      { icon: "⚙️", label: "Ops"      },
  blank:    { icon: "📄", label: "Blank"    },
};

const AVATAR_COLORS = ["#6366f1","#7c3aed","#059669","#f97316","#f43f5e","#0ea5e9"];

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

function daysAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff}d ago`;
}

function deadlineLabel(deadline: string | null) {
  if (!deadline) return null;
  const d = new Date(deadline + "T00:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, overdue: true };
  if (diff === 0) return { text: "Due today", overdue: false };
  if (diff <= 7) return { text: `Due in ${diff}d`, overdue: false };
  return { text: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), overdue: false };
}

async function createProject(formData: FormData) {
  "use server";
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  if (!can(active.role, "project.create")) throw new Error("Forbidden");

  const supabase = await createSupabaseServerClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const deadline = String(formData.get("deadline") ?? "") || null;
  const memberIds = formData.getAll("member_ids") as string[];

  const { data: project } = await supabase
    .from("projects")
    .insert({
      workspace_id: active.workspace.id,
      name,
      description: String(formData.get("description") ?? "") || null,
      template: (String(formData.get("template") ?? "blank") as any),
      status: "active",
      created_by: active.member.user_id,
      deadline,
    } as any)
    .select("id")
    .single();

  if (project?.id) {
    // Add creator + selected members to project_members
    const allMemberIds = [...new Set([active.member.user_id, ...memberIds])];
    try {
      await supabaseAdmin.from("project_members").insert(
        allMemberIds.map(uid => ({
          project_id: project.id,
          user_id: uid,
          role: (uid === active.member.user_id ? "owner" : "member") as any,
        } as any))
      );
    } catch { /* ignore duplicate inserts */ }

    // Notify invited members (excluding creator)
    const toNotify = memberIds.filter(uid => uid !== active.member.user_id);
    if (toNotify.length > 0) {
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();
      const creatorName = creatorProfile
        ? `${creatorProfile.first_name} ${creatorProfile.last_name}`.trim()
        : "A manager";

      try {
        await supabaseAdmin.from("notifications").insert(
          toNotify.map(uid => ({
            workspace_id: active.workspace.id,
            user_id: uid,
            type: "task_assignment" as any,
            title: `Added to project: ${name}`,
            body: `${creatorName} added you to the project "${name}".`,
          } as any))
        );
      } catch { /* non-critical */ }
    }

    revalidatePath("/projects");
    redirect(`/projects/${project.id}`);
  }

  revalidatePath("/projects");
  redirect("/projects");
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; status?: string }>;
}) {
  const params = await searchParams;
  const showNew = params.new === "1";
  const filterStatus = params.status ?? "all";

  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  // Fetch projects
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", active.workspace.id)
    .order("created_at", { ascending: false });

  const projectIds = (projects ?? []).map(p => p.id);

  let totalCounts: Record<string, number> = {};
  let doneCounts: Record<string, number> = {};
  let inProgressTotal = 0;
  let projectMemberMap: Record<string, { initials: string; color: string }[]> = {};
  let projectDeadlineMap: Record<string, string | null> = {};

  // Build deadline map from projects (deadline is a direct column)
  for (const p of projects ?? []) {
    projectDeadlineMap[p.id] = (p as any).deadline ?? null;
  }

  if (projectIds.length > 0) {
    const [{ data: totalRows }, { data: doneRows }, { data: inProgressRows }, { data: assigneeRows }] = await Promise.all([
      supabase.from("tasks").select("project_id").eq("workspace_id", active.workspace.id).in("project_id", projectIds),
      supabase.from("tasks").select("project_id").eq("workspace_id", active.workspace.id).in("project_id", projectIds).eq("status", "completed"),
      supabase.from("tasks").select("id").eq("workspace_id", active.workspace.id).in("project_id", projectIds).eq("status", "in_progress"),
      supabase.from("tasks")
        .select("project_id, profiles!assigned_to(first_name, last_name)")
        .eq("workspace_id", active.workspace.id)
        .in("project_id", projectIds)
        .not("assigned_to", "is", null),
    ]);

    for (const row of totalRows ?? []) {
      if (row.project_id) totalCounts[row.project_id] = (totalCounts[row.project_id] ?? 0) + 1;
    }
    for (const row of doneRows ?? []) {
      if (row.project_id) doneCounts[row.project_id] = (doneCounts[row.project_id] ?? 0) + 1;
    }
    inProgressTotal = (inProgressRows ?? []).length;

    const seenPerProject: Record<string, Set<string>> = {};
    for (const row of assigneeRows ?? []) {
      const pid = (row as any).project_id;
      const p = (row as any).profiles;
      if (!pid || !p) continue;
      const name = `${p.first_name ?? ""}${p.last_name ?? ""}`;
      if (!seenPerProject[pid]) seenPerProject[pid] = new Set();
      if (seenPerProject[pid].has(name)) continue;
      seenPerProject[pid].add(name);
      if (!projectMemberMap[pid]) projectMemberMap[pid] = [];
      if (projectMemberMap[pid].length < 4) {
        const initials = ((p.first_name?.[0] ?? "") + (p.last_name?.[0] ?? "")).toUpperCase();
        projectMemberMap[pid].push({ initials, color: AVATAR_COLORS[projectMemberMap[pid].length % AVATAR_COLORS.length] });
      }
    }
  }

  // Fetch workspace members for the creation form
  const { data: workspaceMembers } = await supabase
    .from("workspace_members")
    .select(`id, user_id, role, profiles!workspace_members_user_id_profiles_fkey(first_name, last_name)`)
    .eq("workspace_id", active.workspace.id)
    .eq("status", "active")
    .neq("user_id", active.member.user_id); // exclude self (creator auto-added)

  const members = (workspaceMembers ?? []).map(m => ({
    userId: (m as any).user_id as string,
    name: `${(m as any).profiles?.first_name ?? ""} ${(m as any).profiles?.last_name ?? ""}`.trim(),
    role: (m as any).role as string,
    initials: (((m as any).profiles?.first_name?.[0] ?? "") + ((m as any).profiles?.last_name?.[0] ?? "")).toUpperCase(),
  }));

  const canCreate = can(active.role, "project.create");
  const totalProjects = (projects ?? []).length;
  const activeProjects = (projects ?? []).filter(p => p.status === "active").length;
  const completedProjects = (projects ?? []).filter(p => p.status === "completed").length;

  const filteredProjects = filterStatus === "all"
    ? (projects ?? [])
    : (projects ?? []).filter(p => p.status === filterStatus);

  const filterTabs = [
    { key: "all",       label: "All",       count: totalProjects },
    { key: "active",    label: "Active",    count: activeProjects },
    { key: "completed", label: "Completed", count: completedProjects },
    { key: "archived",  label: "Archived",  count: (projects ?? []).filter(p => p.status === "archived").length },
  ];

  const ROLE_COLORS: Record<string, string> = {
    owner: "bg-indigo-100 text-indigo-700",
    admin: "bg-violet-100 text-violet-700",
    manager: "bg-blue-100 text-blue-700",
    member: "bg-slate-100 text-slate-600",
    guest: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-up">

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Layers className="h-5 w-5 text-indigo-500" />, label: "Total Projects", value: totalProjects, sub: `${activeProjects} active`, bg: "bg-indigo-50" },
          { icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />, label: "Completed", value: completedProjects, sub: `${Math.round(totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0)}% completion rate`, bg: "bg-emerald-50" },
          { icon: <Activity className="h-5 w-5 text-orange-500" />, label: "Tasks In Progress", value: inProgressTotal, sub: "across all projects", bg: "bg-orange-50" },
        ].map(({ icon, label, value, sub, bg }) => (
          <div key={label} className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "rgba(255,255,255,0.60)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.70)", boxShadow: "0 2px 16px rgba(100,140,180,0.10), inset 0 1px 0 rgba(255,255,255,0.80)" }}>
            <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
            <div>
              <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{value}</p>
              <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{label}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Creation form */}
      {showNew && canCreate && (
        <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "rgba(255,255,255,0.70)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.75)", boxShadow: "0 4px 32px rgba(100,140,180,0.14), inset 0 1px 0 rgba(255,255,255,0.90)" }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-xl flex items-center justify-center shadow-md" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.30)" }}>
                <Plus className="h-4 w-4 text-white" />
              </span>
              Create a new project
            </h2>
            <Link href="/projects">
              <button className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </Link>
          </div>

          <form action={createProject} className="space-y-5">
            {/* Row 1: name + template */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Project name *</Label>
                <Input id="name" name="name" placeholder="e.g. Q3 Marketing Campaign" required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="template">Template</Label>
                <select id="template" name="template" defaultValue="blank" className="flex h-10 w-full rounded-xl border border-border bg-white/60 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <option value="blank">📄 Blank</option>
                  <option value="software">💻 Software</option>
                  <option value="agency">🏢 Agency</option>
                  <option value="ops">⚙️ Operations</option>
                </select>
              </div>
            </div>

            {/* Row 2: description + deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="What is this project about?" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deadline" className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                  Deadline <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input id="deadline" name="deadline" type="date" className="bg-white/60" />
              </div>
            </div>

            {/* Member picker */}
            {members.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-indigo-500" />
                  Invite teammates <span className="text-muted-foreground font-normal">(optional — select who works on this)</span>
                </Label>
                <div className="rounded-2xl p-3 overflow-y-auto" style={{ maxHeight: "180px", background: "rgba(255,255,255,0.45)", border: "1px solid rgba(200,220,235,0.60)" }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {members.map((m, i) => (
                      <label
                        key={m.userId}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all select-none group"
                        style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(200,220,235,0.50)" }}
                      >
                        <input
                          type="checkbox"
                          name="member_ids"
                          value={m.userId}
                          className="peer hidden"
                        />
                        {/* Avatar */}
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 transition-transform peer-checked:scale-110"
                          style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                        >
                          {m.initials || "?"}
                        </div>
                        {/* Name + role */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{m.name}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${ROLE_COLORS[m.role] ?? ROLE_COLORS.member}`}>
                            {m.role}
                          </span>
                        </div>
                        {/* Checkmark indicator */}
                        <div className="h-5 w-5 rounded-full border-2 border-border flex items-center justify-center shrink-0 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-colors">
                          <Check className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">Selected members will be notified and added to the project team.</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="submit">Create Project</Button>
              <Link href="/projects"><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </div>
      )}

      {/* Filter tabs + grid */}
      {(projects ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-5 shadow-sm">
            <FolderOpen className="h-10 w-10 text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">No projects yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">Projects help you group related tasks, track progress, and collaborate with specific teammates.</p>
          {canCreate && (
            <Link href="/projects?new=1">
              <Button className="shadow-md"><Plus className="h-4 w-4 mr-2" />Create your first project</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.60)" }}>
            {filterTabs.map(tab => (
              <Link key={tab.key} href={`/projects${tab.key === "all" ? "" : `?status=${tab.key}`}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === tab.key ? "bg-white text-indigo-600 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab.label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filterStatus === tab.key ? "bg-indigo-100 text-indigo-600" : "bg-muted text-muted-foreground"}`}>{tab.count}</span>
              </Link>
            ))}
          </div>

          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No {filterStatus} projects.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project, idx) => {
                const accent = accentFor(project.name);
                const total = totalCounts[project.id] ?? 0;
                const done = doneCounts[project.id] ?? 0;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const tmpl = TEMPLATE_META[(project as any).template ?? "blank"] ?? TEMPLATE_META.blank;
                const members = projectMemberMap[project.id] ?? [];
                const dl = deadlineLabel(projectDeadlineMap[project.id]);

                return (
                  <div key={project.id} className="group animate-fade-up" style={{ animationDelay: `${idx * 50}ms` }}>
                    <Link href={`/projects/${project.id}`} className="block h-full">
                      <div className="rounded-2xl overflow-hidden h-full flex flex-col transition-all duration-200 hover:-translate-y-1"
                        style={{ background: "rgba(255,255,255,0.60)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderLeft: `4px solid ${accent.hex}`, border: `1px solid rgba(255,255,255,0.65)`, borderLeftWidth: "4px", borderLeftColor: accent.hex, boxShadow: "0 2px 16px rgba(100,140,180,0.10), inset 0 1px 0 rgba(255,255,255,0.80)" }}
                      >
                        {/* Card header gradient */}
                        <div className={`bg-gradient-to-r ${accent.bg} px-5 py-4`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-0.5">{tmpl.icon} {tmpl.label}</p>
                              <h3 className="text-base font-bold text-white leading-snug truncate">{project.name}</h3>
                            </div>
                            <StatusBadge status={project.status} />
                          </div>
                          {/* Deadline chip in header */}
                          {dl && (
                            <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${dl.overdue ? "bg-red-500/30 text-red-100" : "bg-white/20 text-white/80"}`}>
                              <CalendarDays className="h-2.5 w-2.5" />
                              {dl.text}
                            </div>
                          )}
                        </div>

                        {/* Card body */}
                        <div className="flex-1 flex flex-col gap-4 p-5">
                          {(project as any).description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{(project as any).description}</p>
                          )}

                          {/* Progress */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{done} / {total} done
                              </span>
                              <span className="font-bold" style={{ color: accent.hex }}>{pct}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-white/60 border border-white/80 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent.hex}cc, ${accent.hex})`, boxShadow: `0 0 6px ${accent.hex}55` }} />
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground border-t border-white/60 pt-3">
                            <div className="flex items-center gap-3">
                              {members.length > 0 ? (
                                <div className="flex -space-x-1.5">
                                  {members.map((m, i) => (
                                    <div key={i} className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 border-white/80 shadow-sm" style={{ background: m.color, zIndex: members.length - i }}>
                                      {m.initials}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px]"><Users className="h-3 w-3" />No assignees</span>
                              )}
                              <span className="flex items-center gap-1 text-[10px]">
                                <Circle className="h-2.5 w-2.5" />
                                {total === 0 ? "No tasks" : `${total} task${total !== 1 ? "s" : ""}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px]">{daysAgo(project.created_at)}</span>
                              <span className="flex items-center gap-1 group-hover:text-indigo-500 transition-colors font-semibold">
                                Open <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
