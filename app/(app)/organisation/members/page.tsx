import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveWorkspace, requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InviteLinkRow } from "@/components/organisation/InviteLinkRow";
import { sendInvitationEmail } from "@/lib/email/send";
import { MemberCard } from "@/components/organisation/MemberCard";
import { BackButton } from "@/components/ui/BackButton";
import { Users, UserPlus, Mail, Info } from "lucide-react";

import { InviteSubmitButton } from "@/components/organisation/InviteSubmitButton";

async function inviteMember(formData: FormData) {
  "use server";
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  if (!can(active.role, "member.add")) throw new Error("Forbidden");

  const supabase = await createSupabaseServerClient();
  const token = randomBytes(24).toString("hex");
  const email = String(formData.get("email") ?? "").trim();

  await supabase.from("invitations").insert({
    workspace_id: active.workspace.id,
    email,
    role: String(formData.get("role") ?? "member") as "owner" | "admin" | "manager" | "member" | "guest",
    department_id: String(formData.get("department_id") ?? "") || null,
    team_id: String(formData.get("team_id") ?? "") || null,
    position: String(formData.get("position") ?? "") || null,
    contract_type: String(formData.get("contract_type") ?? "full_time") as "full_time" | "contract_3m" | "contract_6m" | "contract_12m" | "custom",
    contract_end_date: String(formData.get("contract_end_date") ?? "") || null,
    token,
    invited_by: user.id,
  });

  // Send invitation email via Resend
  try {
    const userName = [(user.profile as any)?.first_name, (user.profile as any)?.last_name].filter(Boolean).join(" ") || user.email || "Someone";
    await sendInvitationEmail({
      to: email,
      workspaceName: active.workspace.name,
      inviterName: userName,
      inviteToken: token,
      role: String(formData.get("role") ?? "member"),
    });
  } catch (err) {
    console.error("[email] sendInvitationEmail failed:", err);
  }

  revalidatePath("/organisation/members");
}

async function cancelInvitation(id: string) {
  "use server";
  const active = await requireActiveWorkspace();
  if (!can(active.role, "member.add")) throw new Error("Forbidden");

  const supabase = await createSupabaseServerClient();
  await supabase.from("invitations").delete().eq("id", id).eq("workspace_id", active.workspace.id);

  revalidatePath("/organisation/members");
}

export default async function MembersPage() {
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  const [{ data: members }, { data: depts }, { data: teams }, { data: invites }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select(`
        id, 
        role, 
        position, 
        status, 
        profiles!workspace_members_user_id_profiles_fkey(
          first_name, 
          last_name, 
          personal_email,
          avatar_url
        ), 
        departments(name), 
        teams(name),
        activity_status(status)
      `)
      .eq("workspace_id", active.workspace.id)
      .order("role", { ascending: false }),
    supabase.from("departments").select("id, name").eq("workspace_id", active.workspace.id),
    supabase.from("teams").select("id, name").eq("workspace_id", active.workspace.id),
    supabase.from("invitations").select("id, email, role, token").eq("workspace_id", active.workspace.id).is("accepted_at", null),
  ]);

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <BackButton />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
                Members
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Manage your company directory, assign roles, departments, and teams.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Active Members & Invites */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span>Active Workspace Members</span>
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                {members?.length || 0}
              </span>
            </h2>
            <div className="space-y-3">
              {(members ?? []).map((m) => {
                const p = (m as any).profiles;
                const d = (m as any).departments;
                const t = (m as any).teams;
                const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.personal_email || "Unnamed Member";
                
                // Safe presence extraction
                const presence = (m.activity_status as any)?.status || 
                                 (Array.isArray(m.activity_status) ? (m.activity_status[0] as any)?.status : null) || 
                                 "offline";

                return (
                  <MemberCard
                    key={m.id}
                    id={m.id}
                    name={name}
                    email={p?.personal_email}
                    role={m.role}
                    position={m.position}
                    status={m.status}
                    presenceStatus={presence}
                    departmentName={d?.name}
                    teamName={t?.name}
                    avatarUrl={p?.avatar_url}
                  />
                );
              })}
              {(members ?? []).length === 0 && (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <p className="text-sm text-muted-foreground italic">No members found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Pending Invitations */}
          {(invites ?? []).length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span>Pending Invitations</span>
                <span className="text-xs bg-amber-55 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold animate-pulse-soft">
                  {invites?.length || 0}
                </span>
              </h2>
              <div className="rounded-xl border border-slate-250 bg-card p-4 space-y-3 shadow-sm">
                <div className="flex items-start gap-2 text-xs text-muted-foreground mb-2">
                  <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Invite links can be copied and shared directly with the recipient if automatic email delivery is delayed.
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {(invites ?? []).map((i) => (
                    <div key={i.id} className="py-1.5 first:pt-0 last:pb-0">
                      <InviteLinkRow
                        id={i.id}
                        email={i.email}
                        role={i.role}
                        token={i.token}
                        onCancel={cancelInvitation}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Invite Member Card (Only for authorized) */}
        {can(active.role, "member.add") && (
          <div className="rounded-xl border border-slate-200 bg-card p-6 shadow-sm sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <UserPlus className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Invite New Teammate</h2>
            </div>
            
            <form action={inviteMember} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs text-muted-foreground">Email Address</Label>
                <Input 
                  id="email"
                  name="email" 
                  type="email" 
                  placeholder="name@company.com"
                  required 
                  className="bg-background border-slate-200 text-sm h-9"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="role" className="text-xs text-muted-foreground">Workspace Role</Label>
                  <select 
                    id="role"
                    name="role" 
                    className="flex h-9 w-full rounded-lg border border-slate-200 bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    defaultValue="member"
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="position" className="text-xs text-muted-foreground">Position / Title</Label>
                  <Input 
                    id="position"
                    name="position" 
                    placeholder="e.g. Senior Designer"
                    className="bg-background border-slate-200 text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="department_id" className="text-xs text-muted-foreground">Department</Label>
                  <select 
                    id="department_id"
                    name="department_id" 
                    className="flex h-9 w-full rounded-lg border border-slate-200 bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="">None</option>
                    {(depts ?? []).map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="team_id" className="text-xs text-muted-foreground">Team</Label>
                  <select 
                    id="team_id"
                    name="team_id" 
                    className="flex h-9 w-full rounded-lg border border-slate-200 bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="">None</option>
                    {(teams ?? []).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="contract_type" className="text-xs text-muted-foreground">Contract Type</Label>
                <select 
                  id="contract_type"
                  name="contract_type" 
                  className="flex h-9 w-full rounded-lg border border-slate-200 bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  defaultValue="full_time"
                >
                  <option value="full_time">Full-time</option>
                  <option value="contract_3m">3 Months Contract</option>
                  <option value="contract_6m">6 Months Contract</option>
                  <option value="contract_12m">12 Months Contract</option>
                  <option value="custom">Custom Contract</option>
                </select>
              </div>

              <InviteSubmitButton />
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
