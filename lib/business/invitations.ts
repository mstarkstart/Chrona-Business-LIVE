import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/types";
import { sendInvitationEmail } from "@/lib/email/send";

export type InvitationLookup =
  | { ok: true; invitation: Tables<"invitations">; workspace: Tables<"workspaces"> }
  | { ok: false; reason: "not_found" | "expired" | "accepted" };

export async function lookupInvitation(token: string): Promise<InvitationLookup> {
  const { data: inv } = await supabaseAdmin
    .from("invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!inv) return { ok: false, reason: "not_found" };
  if (inv.accepted_at) return { ok: false, reason: "accepted" };
  if (new Date(inv.expires_at) < new Date()) return { ok: false, reason: "expired" };

  const { data: workspace } = await supabaseAdmin
    .from("workspaces")
    .select("*")
    .eq("id", inv.workspace_id)
    .single();
  if (!workspace) return { ok: false, reason: "not_found" };

  return { ok: true, invitation: inv, workspace };
}

export async function acceptInvitation(
  token: string,
  newAccount?: { password: string; first_name?: string; last_name?: string }
): Promise<{ businessId: string; userId: string }> {
  const lookup = await lookupInvitation(token);
  if (!lookup.ok) throw new Error(`Invitation ${lookup.reason}`);

  // Find or create the auth user.
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  const found = existing.users.find((u) => u.email?.toLowerCase() === lookup.invitation.email.toLowerCase());

  let userId: string;
  if (found) {
    userId = found.id;
  } else {
    if (!newAccount) throw new Error("Account password required");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: lookup.invitation.email,
      password: newAccount.password,
      email_confirm: true,
      user_metadata: {
        first_name: newAccount.first_name ?? "",
        last_name: newAccount.last_name ?? "",
      },
    });
    if (error || !created.user) throw error ?? new Error("User creation failed");
    userId = created.user.id;

    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      first_name: newAccount.first_name ?? "",
      last_name: newAccount.last_name ?? "",
      personal_email: lookup.invitation.email,
    });
  }

  // Create membership.
  const { data: member } = await supabaseAdmin
    .from("workspace_members")
    .insert({
      workspace_id: lookup.invitation.workspace_id,
      user_id: userId,
      role: lookup.invitation.role,
      department_id: lookup.invitation.department_id,
      team_id: lookup.invitation.team_id,
      position: lookup.invitation.position,
      contract_type: lookup.invitation.contract_type,
      contract_end_date: lookup.invitation.contract_end_date,
      status: "active",
      date_joined: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (member) {
    await supabaseAdmin.from("activity_status").upsert({
      workspace_member_id: member.id,
      status: "available",
    });
  }

  // If invited as employer (i.e. partnership partner), record them in partners too.
  if (lookup.invitation.role === "owner" && lookup.workspace.business_type === "partnership") {
    await supabaseAdmin.from("partners").insert({
      workspace_id: lookup.invitation.workspace_id,
      user_id: userId,
    });
  }

  await supabaseAdmin
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", lookup.invitation.id);

  // Send a welcome email to the new member after they accept.
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("first_name, last_name, personal_email")
    .eq("id", userId)
    .maybeSingle();

  const memberEmail = profile?.personal_email ?? lookup.invitation.email;

  // Re-use sendInvitationEmail as a welcome confirmation — the token is already
  // consumed, but this doubles as a "you're now in" notification email.
  await sendInvitationEmail({
    to: memberEmail,
    workspaceName: lookup.workspace.name,
    inviterName: "Chrona",
    inviteToken: lookup.invitation.token, // token is spent — URL leads to "already accepted" page
    role: lookup.invitation.role,
  }).catch((e) => console.error("[email] welcome email failed:", e));

  return { businessId: lookup.invitation.workspace_id, userId };
}
