import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveBusiness, requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/dashboard/Cards";

async function createDept(formData: FormData) {
  "use server";
  const user = await requireUser();
  const active = await requireActiveBusiness();
  if (!can(active.role, "department.create")) throw new Error("Forbidden");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  if (active.business.business_type === "partnership" && active.business.partnership_requires_approval) {
    await supabaseAdmin.from("approval_requests").insert({
      business_id: active.business.id,
      requested_by: user.id,
      action_type: "add_department",
      payload: { name },
    });
  } else {
    const supabase = await createSupabaseServerClient();
    await supabase.from("departments").insert({ business_id: active.business.id, name });
  }
  revalidatePath("/organisation/departments");
}

async function deleteDept(formData: FormData) {
  "use server";
  const active = await requireActiveBusiness();
  if (!can(active.role, "department.delete")) throw new Error("Forbidden");
  const id = String(formData.get("id") ?? "");
  const supabase = await createSupabaseServerClient();
  await supabase.from("departments").delete().eq("id", id);
  revalidatePath("/organisation/departments");
}

export default async function DepartmentsPage() {
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();
  const { data: depts } = await supabase
    .from("departments")
    .select("*")
    .eq("business_id", active.business.id)
    .order("name");

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Departments</h1>

      {can(active.role, "department.create") && (
        <Card>
          <form action={createDept} className="flex gap-2">
            <Input name="name" placeholder="New department name" required />
            <Button type="submit">Add</Button>
          </form>
          {active.business.business_type === "partnership" && active.business.partnership_requires_approval && (
            <p className="text-xs text-muted-foreground mt-2">Partnership: structural changes require partner approval.</p>
          )}
        </Card>
      )}

      <ul className="space-y-2">
        {(depts ?? []).length === 0 && <li className="text-sm text-muted-foreground italic">No departments yet.</li>}
        {(depts ?? []).map((d) => (
          <li key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
            <span>{d.name}</span>
            {can(active.role, "department.delete") && (
              <form action={deleteDept}>
                <input type="hidden" name="id" value={d.id} />
                <Button variant="ghost" size="sm">Delete</Button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
