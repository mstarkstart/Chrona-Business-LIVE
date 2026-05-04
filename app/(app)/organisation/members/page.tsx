import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { headers } from "next/headers";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireActiveBusiness, requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/dashboard/Cards";
import { InviteLinkRow } from "@/components/organisation/InviteLinkRow";

async function inviteMember(formData: FormData) {
  "use server";
  const user = await requireUser();
  const active = await requireActiveBusiness();
  if (!can(active.role, "member.add")) throw new Error("Forbidden");

  const supabase = await createSupabaseServerClient();
  const token = randomBytes(24).toString("hex");
  const email = String(formData.get("email") ?? "").trim();

  await supabase.from("invitations").insert({
    business_id: active.business.id,
    email,
    role: String(formData.get("role") ?? "employee") as "employer" | "c_suite" | "manager" | "team_lead" | "employee",
    department_id: String(formData.get("department_id") ?? "") || null,
    team_id: String(formData.get("team_id") ?? "") || null,
    position: String(formData.get("position") ?? "") || null,
    contract_type: String(formData.get("contract_type") ?? "full_time") as "full_time" | "contract_3m" | "contract_6m" | "contract_12m" | "custom",
    contract_end_date: String(formData.get("contract_end_date") ?? "") || null,
    token,
    invited_by: user.id,
  });

  // Best-effort email send via Supabase Auth's invite system. If SMTP isn't
  // configured (or the user already exists), this fails silently and the
  // copy-link UI is the fallback.
  try {
    const h = await headers();
    const origin = h.get("origin") ?? `https://${h.get("host")}`;
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      // Route through /auth/callback so the magic-link code becomes a session
      // before we land on the invite acceptance page.
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(`/invite/${token}`)}`,
    });
  } catch {
    // Swallow — the copy-link in the pending-invitations list still works.
  }

  revalidatePath("/organisation/members");
}

export default async function MembersPage() {
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();

  const [{ data: members }, { data: depts }, { data: teams }, { data: invites }] = await Promise.all([
    supabase
      .from("business_members")
      .select("id, role, position, status, profiles!business_members_user_id_profiles_fkey(first_name, last_name, personal_email), departments(name), teams(name)")
      .eq("business_id", active.business.id)
      .order("role", { ascending: false }),
    supabase.from("departments").select("id, name").eq("business_id", active.business.id),
    supabase.from("teams").select("id, name").eq("business_id", active.business.id),
    supabase.from("invitations").select("id, email, role, token").eq("business_id", active.business.id).is("accepted_at", null),
  ]);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <h1 className="text-2xl font-semibold">Members</h1>

      {can(active.role, "member.add") && (
        <Card>
          <form action={inviteMember} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Email</Label><Input name="email" type="email" required /></div>
            <div>
              <Label>Role</Label>
              <select name="role" className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" defaultValue="employee">
                <option value="employee">Employee</option>
                <option value="team_lead">Team Lead</option>
                <option value="manager">Manager</option>
                <option value="c_suite">C-Suite</option>
              </select>
            </div>
            <div><Label>Position</Label><Input name="position" /></div>
            <div>
              <Label>Department</Label>
              <select name="department_id" className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm">
                <option value="">None</option>
                {(depts ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Team</Label>
              <select name="team_id" className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm">
                <option value="">None</option>
                {(teams ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Contract</Label>
              <select name="contract_type" className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" defaultValue="full_time">
                <option value="full_time">Full-time</option>
                <option value="contract_3m">3 months</option>
                <option value="contract_6m">6 months</option>
                <option value="contract_12m">12 months</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Send invitation</Button>
            </div>
          </form>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-semibold mb-2">Active members</h2>
        <ul className="space-y-2">
          {(members ?? []).map((m) => {
            const p = (m as unknown as { profiles?: { first_name?: string; last_name?: string; personal_email?: string } }).profiles;
            const d = (m as unknown as { departments?: { name?: string } | null }).departments;
            const t = (m as unknown as { teams?: { name?: string } | null }).teams;
            const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.personal_email;
            return (
              <li key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <div>
                  <div className="font-medium">{name}</div>
                  <div className="text-xs text-muted-foreground">
                    {ROLE_LABEL[m.role as keyof typeof ROLE_LABEL]}
                    {m.position ? ` · ${m.position}` : ""}
                    {d?.name ? ` · ${d.name}` : ""}
                    {t?.name ? ` / ${t.name}` : ""}
                  </div>
                </div>
                <Link href={`/organisation/members/${m.id}`} className="text-sm text-indigo-600 hover:underline">View</Link>
              </li>
            );
          })}
        </ul>
      </div>

      {(invites ?? []).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-1">Pending invitations</h2>
          <p className="text-xs text-muted-foreground mb-2">
            Email sending is not wired up in v1 — copy the invite link and share it directly with the recipient.
          </p>
          <ul className="space-y-2">
            {(invites ?? []).map((i) => (
              <InviteLinkRow key={i.id} email={i.email} role={ROLE_LABEL[i.role as keyof typeof ROLE_LABEL]} token={i.token} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
