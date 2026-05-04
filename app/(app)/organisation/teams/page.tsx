import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveBusiness } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/dashboard/Cards";

async function createTeam(formData: FormData) {
  "use server";
  const active = await requireActiveBusiness();
  if (!can(active.role, "team.create")) throw new Error("Forbidden");
  const name = String(formData.get("name") ?? "").trim();
  const departmentId = String(formData.get("department_id") ?? "") || null;
  if (!name) return;
  const supabase = await createSupabaseServerClient();
  await supabase.from("teams").insert({
    business_id: active.business.id,
    name,
    department_id: departmentId,
  });
  revalidatePath("/organisation/teams");
}

async function deleteTeam(formData: FormData) {
  "use server";
  const active = await requireActiveBusiness();
  if (!can(active.role, "team.delete")) throw new Error("Forbidden");
  const id = String(formData.get("id") ?? "");
  const supabase = await createSupabaseServerClient();
  await supabase.from("teams").delete().eq("id", id);
  revalidatePath("/organisation/teams");
}

export default async function TeamsPage() {
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();
  const [{ data: teams }, { data: depts }] = await Promise.all([
    supabase.from("teams").select("*, departments(name)").eq("business_id", active.business.id).order("name"),
    supabase.from("departments").select("id, name").eq("business_id", active.business.id).order("name"),
  ]);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Teams</h1>

      {can(active.role, "team.create") && (
        <Card>
          <form action={createTeam} className="flex gap-2">
            <Input name="name" placeholder="New team name" required />
            <select name="department_id" className="h-10 rounded-lg border border-border bg-card px-3 text-sm">
              <option value="">No department</option>
              {(depts ?? []).map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
            <Button type="submit">Add</Button>
          </form>
        </Card>
      )}

      <ul className="space-y-2">
        {(teams ?? []).length === 0 && <li className="text-sm text-muted-foreground italic">No teams yet.</li>}
        {(teams ?? []).map((t) => {
          const dept = (t as unknown as { departments?: { name: string } | null }).departments;
          return (
            <li key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div>
                <div className="font-medium">{t.name}</div>
                {dept && <div className="text-xs text-muted-foreground">in {dept.name}</div>}
              </div>
              {can(active.role, "team.delete") && (
                <form action={deleteTeam}>
                  <input type="hidden" name="id" value={t.id} />
                  <Button variant="ghost" size="sm">Delete</Button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
