import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveWorkspace, requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DepartmentCard } from "@/components/organisation/DepartmentCard";
import { BackButton } from "@/components/ui/BackButton";
import { Building2, Plus, Info } from "lucide-react";

async function createDept(formData: FormData) {
  "use server";
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  if (!can(active.role, "department.create")) throw new Error("Forbidden");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return;

  if (active.workspace.business_type === "partnership" && active.workspace.partnership_requires_approval) {
    await supabaseAdmin.from("approval_requests").insert({
      workspace_id: active.workspace.id,
      requested_by: user.id,
      action_type: "add_department",
      payload: { name, description },
    });
  } else {
    const supabase = await createSupabaseServerClient();
    await supabase.from("departments").insert({ 
      workspace_id: active.workspace.id, 
      name,
      description: description || null
    });
  }
  revalidatePath("/organisation/departments");
}

export default async function DepartmentsPage() {
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();
  
  const { data: depts } = await supabase
    .from("departments")
    .select(`
      id,
      name,
      description,
      teams (id),
      workspace_members (id),
      tasks (id, status)
    `)
    .eq("workspace_id", active.workspace.id)
    .order("name");

  async function handleDelete(id: string) {
    "use server";
    const active = await requireActiveWorkspace();
    if (!can(active.role, "department.delete")) throw new Error("Forbidden");
    const supabase = await createSupabaseServerClient();
    await supabase.from("departments").delete().eq("id", id);
    revalidatePath("/organisation/departments");
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <BackButton />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
                Departments
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Organise your workspace into departments to manage permissions, teams, and analytics scopes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* "+ Add Department" Card (only for creators) */}
        {can(active.role, "department.create") && (
          <div className="flex flex-col justify-between rounded-xl border border-dashed border-border bg-card p-5 transition-all duration-300 hover:border-primary/40 hover:bg-slate-50 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Plus className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">Add New Department</h3>
              </div>
              
              <form action={createDept} className="space-y-3">
                <Input 
                  name="name" 
                  placeholder="e.g. Engineering, Sales" 
                  required 
                  className="bg-white border-border shadow-inner"
                />
                <Input 
                  name="description" 
                  placeholder="Optional description" 
                  className="bg-white border-border text-xs shadow-inner"
                />
                <Button type="submit" className="w-full text-xs">
                  Create Department
                </Button>
              </form>
            </div>
            
            {active.workspace.business_type === "partnership" && active.workspace.partnership_requires_approval && (
              <div className="flex items-start gap-1.5 mt-4 text-[10px] text-indigo-650 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span>Partnership mode active: structural additions will require partner approval before appearing.</span>
              </div>
            )}
          </div>
        )}

        {/* Existing Departments */}
        {(depts ?? []).map((d: any) => (
          <DepartmentCard
            key={d.id}
            id={d.id}
            name={d.name}
            description={d.description}
            teamsCount={d.teams?.length || 0}
            membersCount={d.workspace_members?.length || 0}
            activeTasksCount={
              d.tasks?.filter((t: any) => t.status !== "completed" && t.status !== "cancelled").length || 0
            }
            canDelete={can(active.role, "department.delete")}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {(depts ?? []).length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-slate-50">
          <p className="text-sm text-muted-foreground italic">No departments created yet.</p>
        </div>
      )}
    </div>
  );
}
