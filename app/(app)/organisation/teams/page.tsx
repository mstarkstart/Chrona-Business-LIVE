import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveWorkspace } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TeamCard } from "@/components/organisation/TeamCard";
import { BackButton } from "@/components/ui/BackButton";
import { Users2, Plus, Info } from "lucide-react";

async function createTeam(formData: FormData) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "team.create")) throw new Error("Forbidden");
  
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const departmentId = String(formData.get("department_id") ?? "") || null;
  if (!name) return;
  
  const supabase = await createSupabaseServerClient();
  await supabase.from("teams").insert({
    workspace_id: active.workspace.id,
    name,
    description: description || null,
    department_id: departmentId,
  });
  revalidatePath("/organisation/teams");
}

async function setTeamLead(teamId: string, leadMemberId: string | null) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "team.create")) throw new Error("Forbidden");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("teams")
    .update({ lead_member_id: leadMemberId || null })
    .eq("id", teamId);

  revalidatePath("/organisation/teams");
}

export default async function TeamsPage() {
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();
  
  const [{ data: teams }, { data: depts }] = await Promise.all([
    supabase
      .from("teams")
      .select(`
        id,
        name,
        description,
        lead_member_id,
        departments (id, name),
        workspace_members (
          id,
          role,
          profiles!workspace_members_user_id_profiles_fkey (
            first_name,
            last_name,
            avatar_url
          )
        )
      `)
      .eq("workspace_id", active.workspace.id)
      .order("name"),
    supabase.from("departments").select("id, name").eq("workspace_id", active.workspace.id).order("name"),
  ]);

  async function handleDelete(id: string) {
    "use server";
    const active = await requireActiveWorkspace();
    if (!can(active.role, "team.delete")) throw new Error("Forbidden");
    const supabase = await createSupabaseServerClient();
    await supabase.from("teams").delete().eq("id", id);
    revalidatePath("/organisation/teams");
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <BackButton />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Users2 className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
                Teams
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Group your workspace members into functional teams. Filter task boards and analytics by team.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* "+ Add Team" Card (only for creators) */}
        {can(active.role, "team.create") && (
          <div className="flex flex-col justify-between rounded-xl border border-dashed border-border bg-card p-5 transition-all duration-300 hover:border-primary/40 hover:bg-slate-50 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Plus className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">Create New Team</h3>
              </div>
              
              <form action={createTeam} className="space-y-3">
                <Input 
                  name="name" 
                  placeholder="e.g. Design Core, Mobile Dev" 
                  required 
                  className="bg-white border-border shadow-inner"
                />
                <Input 
                  name="description" 
                  placeholder="Optional description" 
                  className="bg-white border-border text-xs shadow-inner"
                />
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Parent Department
                  </label>
                  <select 
                    name="department_id" 
                    className="h-9 w-full rounded-lg border border-border bg-white px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer shadow-sm"
                  >
                    <option value="" className="bg-white text-foreground">No Department</option>
                    {(depts ?? []).map((d) => (
                      <option key={d.id} value={d.id} className="bg-white text-foreground">
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full text-xs">
                  Create Team
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Existing Teams */}
        {(teams ?? []).map((t: any) => (
          <TeamCard
            key={t.id}
            id={t.id}
            name={t.name}
            description={t.description}
            departmentName={t.departments?.name}
            leadMemberId={t.lead_member_id}
            members={(t.workspace_members ?? []).map((m: any) => ({
              id: m.id,
              role: m.role,
              profile: m.profiles,
            }))}
            canDelete={can(active.role, "team.delete")}
            canManageLead={can(active.role, "team.create")}
            onDelete={handleDelete}
            onSetLead={setTeamLead}
          />
        ))}
      </div>

      {(teams ?? []).length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-slate-50">
          <p className="text-sm text-muted-foreground italic">No teams created yet.</p>
        </div>
      )}
    </div>
  );
}
