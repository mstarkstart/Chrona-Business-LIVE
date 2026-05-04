import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveBusiness } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/dashboard/Cards";

async function suspend(formData: FormData) {
  "use server";
  const active = await requireActiveBusiness();
  if (!can(active.role, "member.update_role")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const supabase = await createSupabaseServerClient();
  await supabase.from("business_members").update({ status: "suspended" }).eq("id", id);
  revalidatePath(`/organisation/members/${id}`);
}

async function reactivate(formData: FormData) {
  "use server";
  const active = await requireActiveBusiness();
  if (!can(active.role, "member.update_role")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const supabase = await createSupabaseServerClient();
  await supabase.from("business_members").update({ status: "active" }).eq("id", id);
  revalidatePath(`/organisation/members/${id}`);
}

async function remove(formData: FormData) {
  "use server";
  const active = await requireActiveBusiness();
  if (!can(active.role, "member.remove")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const supabase = await createSupabaseServerClient();
  await supabase.from("business_members").update({ status: "removed" }).eq("id", id);
  redirect("/organisation/members");
}

async function changeRole(formData: FormData) {
  "use server";
  const active = await requireActiveBusiness();
  if (!can(active.role, "member.update_role")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const role = String(formData.get("role"));
  const supabase = await createSupabaseServerClient();
  await supabase.from("business_members").update({ role: role as "employer" | "c_suite" | "manager" | "team_lead" | "employee" }).eq("id", id);
  revalidatePath(`/organisation/members/${id}`);
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();

  const { data: member } = await supabase
    .from("business_members")
    .select("*, profiles!business_members_user_id_profiles_fkey(*), departments(name), teams(name)")
    .eq("id", id)
    .eq("business_id", active.business.id)
    .maybeSingle();

  if (!member) notFound();

  const profile = (member as unknown as { profiles?: { first_name?: string; last_name?: string; personal_email?: string; personal_phone?: string } }).profiles;
  const dept = (member as unknown as { departments?: { name?: string } | null }).departments;
  const team = (member as unknown as { teams?: { name?: string } | null }).teams;

  const { data: recentTasks } = await supabase
    .from("tasks")
    .select("id, title, status, due_date")
    .eq("business_id", active.business.id)
    .eq("assigned_to", member.user_id)
    .order("created_at", { ascending: false })
    .limit(5);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.personal_email;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">{fullName}</h1>
        <p className="text-sm text-muted-foreground">{ROLE_LABEL[member.role as keyof typeof ROLE_LABEL]} · {member.position ?? "—"}</p>
      </div>

      <Card>
        <CardTitle>Profile</CardTitle>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-muted-foreground">Email</dt><dd>{profile?.personal_email}</dd></div>
          <div><dt className="text-muted-foreground">Phone</dt><dd>{profile?.personal_phone ?? "—"}</dd></div>
          <div><dt className="text-muted-foreground">Department</dt><dd>{dept?.name ?? "—"}</dd></div>
          <div><dt className="text-muted-foreground">Team</dt><dd>{team?.name ?? "—"}</dd></div>
          <div><dt className="text-muted-foreground">Contract</dt><dd className="capitalize">{member.contract_type.replace("_", " ")}</dd></div>
          <div><dt className="text-muted-foreground">Status</dt><dd className="capitalize">{member.status}</dd></div>
        </dl>
      </Card>

      <Card>
        <CardTitle>Recent tasks</CardTitle>
        <ul className="mt-3 space-y-1 text-sm">
          {(recentTasks ?? []).length === 0 && <li className="text-muted-foreground italic">No tasks yet.</li>}
          {(recentTasks ?? []).map((t) => (
            <li key={t.id} className="flex justify-between">
              <span>{t.title}</span>
              <span className="text-muted-foreground capitalize">{t.status.replace("_", " ")}</span>
            </li>
          ))}
        </ul>
      </Card>

      {can(active.role, "member.update_role") && (
        <Card>
          <CardTitle>Admin actions</CardTitle>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={changeRole} className="flex items-center gap-2">
              <input type="hidden" name="id" value={member.id} />
              <select name="role" defaultValue={member.role} className="h-9 rounded-md border border-border bg-card px-2 text-sm">
                <option value="employee">Employee</option>
                <option value="team_lead">Team Lead</option>
                <option value="manager">Manager</option>
                <option value="c_suite">C-Suite</option>
              </select>
              <Button size="sm">Change role</Button>
            </form>

            {member.status === "active" ? (
              <form action={suspend}><input type="hidden" name="id" value={member.id} /><Button size="sm" variant="outline">Suspend</Button></form>
            ) : (
              <form action={reactivate}><input type="hidden" name="id" value={member.id} /><Button size="sm" variant="outline">Reactivate</Button></form>
            )}

            <form action={remove}>
              <input type="hidden" name="id" value={member.id} />
              <Button size="sm" variant="destructive">Remove</Button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}
