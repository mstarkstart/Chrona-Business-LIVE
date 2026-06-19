import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveWorkspace } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Card } from "@/components/dashboard/Cards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/BackButton";
import { WorkspaceLogoUploader } from "@/components/settings/WorkspaceLogoUploader";
import { Building2, Info } from "lucide-react";

async function save(formData: FormData) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "workspace.update")) throw new Error("Forbidden");
  const supabase = await createSupabaseServerClient();
  await supabase.from("workspaces").update({
    name: String(formData.get("name") ?? ""),
    industry: String(formData.get("industry") ?? "") || null,
    services: String(formData.get("services") ?? "") || null,
    employee_count_estimate: Number(formData.get("employee_count_estimate") ?? 0) || null,
    team_count_estimate: Number(formData.get("team_count_estimate") ?? 0) || null,
  }).eq("id", active.workspace.id);
  revalidatePath("/settings/business");
  revalidatePath("/dashboard");
}

async function saveLogoAction(url: string) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "workspace.update")) throw new Error("Forbidden");
  const supabase = await createSupabaseServerClient();
  await supabase.from("workspaces").update({ logo_url: url }).eq("id", active.workspace.id);
  revalidatePath("/settings/business");
  revalidatePath("/dashboard");
}

export default async function BusinessSettings() {
  const active = await requireActiveWorkspace();
  const b = active.workspace;
  const editable = can(active.role, "workspace.update");
  const logoUrl = (b as any).logo_url as string | null ?? null;

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <BackButton />
        <div className="flex items-center gap-2.5">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
            Workspace Configuration
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Manage workspace settings, industry classifications, and metadata.
        </p>
      </div>

      {/* Logo upload */}
      {editable && (
        <div className="rounded-xl border border-slate-200 bg-card p-6 shadow-sm animate-fade-up card-hover flex items-center gap-6">
          <WorkspaceLogoUploader
            workspaceId={active.workspace.id}
            initialUrl={logoUrl}
            onUploadComplete={saveLogoAction}
          />
          <div>
            <p className="text-sm font-semibold text-foreground">Workspace Logo</p>
            <p className="text-xs text-muted-foreground mt-1">Upload a square PNG or JPG. Shown in the sidebar next to the workspace name.</p>
          </div>
        </div>
      )}

      {!editable && (
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-3 text-xs text-muted-foreground flex items-start gap-2.5 shadow-sm animate-fade-up">
          <Info className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
          <span>You have view-only access. Contact your workspace owner to make structural changes.</span>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-card p-6 shadow-sm animate-fade-up delay-100 card-hover">
        <form action={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground font-semibold">Workspace Name</Label>
            <Input name="name" defaultValue={b.name} disabled={!editable} className="bg-background border-slate-200 text-sm h-9" />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-semibold">Industry Sector</Label>
            <Input name="industry" defaultValue={b.industry ?? ""} disabled={!editable} className="bg-background border-slate-200 text-sm h-9" />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-semibold">Business Model</Label>
            <Input value={b.business_type} disabled className="bg-background border-slate-200 text-sm h-9 cursor-not-allowed opacity-75 capitalize" />
          </div>
          
          <div className="md:col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground font-semibold">Core Services</Label>
            <Input name="services" defaultValue={b.services ?? ""} disabled={!editable} className="bg-background border-slate-200 text-sm h-9" />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-semibold">Estimated Employees</Label>
            <Input name="employee_count_estimate" type="number" defaultValue={b.employee_count_estimate ?? 0} disabled={!editable} className="bg-background border-slate-200 text-sm h-9" />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-semibold">Estimated Teams</Label>
            <Input name="team_count_estimate" type="number" defaultValue={b.team_count_estimate ?? 0} disabled={!editable} className="bg-background border-slate-200 text-sm h-9" />
          </div>
          
          {editable && (
            <div className="md:col-span-2 pt-2">
              <Button type="submit" className="w-full md:w-auto text-xs font-semibold py-2">
                Save Workspace Settings
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
