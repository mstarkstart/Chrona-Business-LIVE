import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireActiveWorkspace } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/BackButton";
import { Shield, Layers, Calendar, User, Briefcase, Mail, CheckCircle, AlertTriangle } from "lucide-react";

async function suspend(formData: FormData) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "member.update_role")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const supabase = await createSupabaseServerClient();
  await supabase.from("workspace_members").update({ status: "suspended" }).eq("id", id);
  // Immediately take them offline so they disappear from Live Activity
  await supabaseAdmin.from("activity_status")
    .upsert({ workspace_member_id: id, status: "offline" }, { onConflict: "workspace_member_id" });
  revalidatePath(`/organisation/members/${id}`);
  revalidatePath("/organisation/members");
  revalidatePath("/dashboard");
}

async function reactivate(formData: FormData) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "member.update_role")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const supabase = await createSupabaseServerClient();
  await supabase.from("workspace_members").update({ status: "active" }).eq("id", id);
  // Reset their activity status to available when reactivating
  await supabaseAdmin.from("activity_status")
    .upsert({ workspace_member_id: id, status: "available" }, { onConflict: "workspace_member_id" });
  revalidatePath(`/organisation/members/${id}`);
  revalidatePath("/organisation/members");
  revalidatePath("/dashboard");
}

async function remove(formData: FormData) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "member.remove")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const supabase = await createSupabaseServerClient();
  await supabase.from("workspace_members").update({ status: "removed" }).eq("id", id);
  redirect("/organisation/members");
}

async function changeRole(formData: FormData) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "member.update_role")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const role = String(formData.get("role"));
  const supabase = await createSupabaseServerClient();
  await supabase.from("workspace_members").update({ role: role as "owner" | "admin" | "manager" | "member" }).eq("id", id);
  revalidatePath(`/organisation/members/${id}`);
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  const { data: member } = await supabase
    .from("workspace_members")
    .select("*, profiles!workspace_members_user_id_profiles_fkey(*), departments(name), teams(name)")
    .eq("id", id)
    .eq("workspace_id", active.workspace.id)
    .maybeSingle();

  if (!member) notFound();

  const profile = (member as any).profiles;
  const dept = (member as any).departments;
  const team = (member as any).teams;

  const { data: recentTasks } = await supabase
    .from("tasks")
    .select("id, title, status, due_date, priority")
    .eq("workspace_id", active.workspace.id)
    .eq("assigned_to", member.user_id)
    .order("created_at", { ascending: false })
    .limit(5);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.personal_email || "Unnamed Member";

  const roleStyles: Record<string, string> = {
    owner: "bg-amber-50 text-amber-700 border border-amber-250 shadow-[0_1px_3px_rgba(245,158,11,0.05)]",
    admin: "bg-sky-50 text-sky-700 border border-sky-250 shadow-[0_1px_3px_rgba(14,165,233,0.05)]",
    manager: "bg-emerald-50 text-emerald-700 border border-emerald-250 shadow-[0_1px_3px_rgba(16,185,129,0.05)]",
    member: "bg-slate-100 text-slate-700 border border-slate-200",
    guest: "bg-purple-50 text-purple-700 border border-purple-250",
  };
  const roleBadge = roleStyles[member.role.toLowerCase()] || roleStyles.member;

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div>
        <BackButton />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4.5">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={fullName}
                className="h-16 w-16 rounded-full object-cover ring-4 ring-slate-100"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-muted-foreground border border-slate-200 select-none">
                {fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
              </div>
            )}
            
            <div className="space-y-1">
              <div className="flex items-center flex-wrap gap-2.5">
                <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
                  {fullName}
                </h1>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${roleBadge}`}>
                  {ROLE_LABEL[member.role as keyof typeof ROLE_LABEL]}
                </span>
                {member.status === "suspended" && (
                  <span className="text-xs font-bold bg-red-50 text-red-750 border border-red-200 px-2.5 py-0.5 rounded-full animate-pulse-soft">
                    SUSPENDED
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {member.position ?? "No title specified"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Profile details & Admin Actions */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-primary" />
              <span>Profile Information</span>
            </h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div className="space-y-0.5">
                <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Email</dt>
                <dd className="text-foreground flex items-center gap-1.5 mt-0.5">
                  <Mail className="h-4 w-4 text-muted-foreground/60" />
                  {profile?.personal_email || "—"}
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Phone</dt>
                <dd className="text-foreground mt-0.5">{profile?.personal_phone ?? "—"}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Department</dt>
                <dd className="text-foreground flex items-center gap-1.5 mt-0.5">
                  <Layers className="h-4 w-4 text-muted-foreground/60" />
                  {dept?.name ?? "—"}
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Team</dt>
                <dd className="text-foreground flex items-center gap-1.5 mt-0.5">
                  <User className="h-4 w-4 text-muted-foreground/60" />
                  {team?.name ?? "—"}
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Contract Type</dt>
                <dd className="text-foreground flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-4 w-4 text-muted-foreground/60" />
                  <span className="capitalize">{member.contract_type.replace("_", " ")}</span>
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Workspace Status</dt>
                <dd className="text-foreground mt-0.5 flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${member.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
                  <span className="capitalize">{member.status}</span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Admin actions (Only for managers/admins/owners) */}
          {can(active.role, "member.update_role") && (
            <div className="rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Shield className="h-4.5 w-4.5 text-primary" />
                <span>Admin Actions</span>
              </h2>
              <div className="flex flex-col md:flex-row md:items-center gap-4 flex-wrap">
                <form action={changeRole} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <input type="hidden" name="id" value={member.id} />
                  <select 
                    name="role" 
                    defaultValue={member.role} 
                    className="h-8.5 rounded-md border border-slate-200 bg-background text-xs px-2.5 text-foreground focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="member">Employee</option>
                    <option value="manager">Team Lead / Manager</option>
                    <option value="admin">C-Suite / Admin</option>
                  </select>
                  <Button size="sm" className="h-8.5 text-xs">Update Role</Button>
                </form>

                <div className="flex items-center gap-2">
                  {member.status === "active" ? (
                    <form action={suspend}>
                      <input type="hidden" name="id" value={member.id} />
                      <Button size="sm" variant="outline" className="border-red-200 text-red-650 hover:bg-red-50 h-8.5 text-xs cursor-pointer">
                        Suspend
                      </Button>
                    </form>
                  ) : (
                    <form action={reactivate}>
                      <input type="hidden" name="id" value={member.id} />
                      <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-650 hover:bg-emerald-50 h-8.5 text-xs cursor-pointer">
                        Reactivate
                      </Button>
                    </form>
                  )}

                  <form action={remove}>
                    <input type="hidden" name="id" value={member.id} />
                    <Button size="sm" variant="destructive" className="h-8.5 text-xs cursor-pointer">
                      Remove
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recent Tasks */}
        <div className="rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="h-4.5 w-4.5 text-primary" />
            <span>Recent Tasks</span>
          </h2>
          <div className="space-y-3">
            {(recentTasks ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">No tasks assigned yet.</p>
            )}
            {(recentTasks ?? []).map((t) => {
              const priorityStyles: Record<string, string> = {
                urgent: "bg-red-50 text-red-700 border border-red-200",
                high: "bg-orange-55 text-orange-700 border border-orange-200",
                normal: "bg-slate-100 text-slate-700 border border-slate-200",
                low: "bg-zinc-100 text-zinc-700 border border-zinc-200",
              };
              const statusStyles: Record<string, string> = {
                completed: "bg-emerald-50 text-emerald-700 border border-emerald-250",
                in_progress: "bg-amber-50 text-amber-700 border border-amber-250",
                pending: "bg-sky-50 text-sky-700 border border-sky-200",
                awaiting_approval: "bg-purple-55 text-purple-700 border border-purple-200",
              };
              return (
                <div key={t.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 space-y-2 text-xs">
                  <div className="font-medium text-foreground line-clamp-2">
                    {t.title}
                  </div>
                  <div className="flex items-center gap-2 justify-between flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusStyles[t.status] || "bg-slate-100 text-slate-700"}`}>
                      {t.status.replace("_", " ")}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityStyles[t.priority] || "bg-slate-100"}`}>
                      {t.priority}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
