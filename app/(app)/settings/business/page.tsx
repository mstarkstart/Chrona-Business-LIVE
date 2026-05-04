import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveBusiness } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Card } from "@/components/dashboard/Cards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

async function save(formData: FormData) {
  "use server";
  const active = await requireActiveBusiness();
  if (!can(active.role, "business.update")) throw new Error("Forbidden");
  const supabase = await createSupabaseServerClient();
  await supabase.from("businesses").update({
    name: String(formData.get("name") ?? ""),
    industry: String(formData.get("industry") ?? "") || null,
    services: String(formData.get("services") ?? "") || null,
    employee_count_estimate: Number(formData.get("employee_count_estimate") ?? 0) || null,
    team_count_estimate: Number(formData.get("team_count_estimate") ?? 0) || null,
  }).eq("id", active.business.id);
  revalidatePath("/settings/business");
}

export default async function BusinessSettings() {
  const active = await requireActiveBusiness();
  const b = active.business;
  const editable = can(active.role, "business.update");

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Business</h1>
      <Card>
        <form action={save} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>Name</Label><Input name="name" defaultValue={b.name} disabled={!editable} /></div>
          <div><Label>Industry</Label><Input name="industry" defaultValue={b.industry ?? ""} disabled={!editable} /></div>
          <div><Label>Type</Label><Input value={b.business_type} disabled /></div>
          <div className="md:col-span-2"><Label>Services</Label><Input name="services" defaultValue={b.services ?? ""} disabled={!editable} /></div>
          <div><Label>Employee count</Label><Input name="employee_count_estimate" type="number" defaultValue={b.employee_count_estimate ?? 0} disabled={!editable} /></div>
          <div><Label>Team count</Label><Input name="team_count_estimate" type="number" defaultValue={b.team_count_estimate ?? 0} disabled={!editable} /></div>
          {editable && <div className="md:col-span-2"><Button type="submit">Save</Button></div>}
        </form>
      </Card>
    </div>
  );
}
