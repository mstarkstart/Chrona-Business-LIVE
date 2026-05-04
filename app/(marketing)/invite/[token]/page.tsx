import { redirect } from "next/navigation";
import Link from "next/link";
import { lookupInvitation, acceptInvitation } from "@/lib/business/invitations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Path A: user pasted the link directly. Not signed in. Set name + password,
// we create the auth user, the profile, the membership, then sign them in.
async function acceptAsNewAccount(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const first = String(formData.get("first_name") ?? "");
  const last = String(formData.get("last_name") ?? "");

  const lookup = await lookupInvitation(token);
  if (!lookup.ok) redirect(`/invite/${token}?error=${lookup.reason}`);

  const { businessId } = await acceptInvitation(token, { password, first_name: first, last_name: last });

  const supabase = await createSupabaseServerClient();
  if (lookup.ok) {
    await supabase.auth.signInWithPassword({ email: lookup.invitation.email, password });
  }
  redirect(`/dashboard?business=${businessId}`);
}

// Path B: user clicked the email link. Already authenticated as the new auth
// user (Supabase did that for us). Just set a password, profile, and membership.
async function acceptAsCurrentUser(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const first = String(formData.get("first_name") ?? "");
  const last = String(formData.get("last_name") ?? "");

  const lookup = await lookupInvitation(token);
  if (!lookup.ok) redirect(`/invite/${token}?error=${lookup.reason}`);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/invite/${token}`);
  if (user.email?.toLowerCase() !== lookup.invitation.email.toLowerCase()) {
    redirect(`/invite/${token}?error=email_mismatch`);
  }

  // Set their password (Supabase invite flow leaves it unset).
  await supabase.auth.updateUser({ password });

  // Upsert profile.
  await supabaseAdmin.from("profiles").upsert({
    id: user.id,
    first_name: first,
    last_name: last,
    personal_email: lookup.invitation.email,
  });

  // Create membership.
  const { data: member } = await supabaseAdmin
    .from("business_members")
    .insert({
      business_id: lookup.invitation.business_id,
      user_id: user.id,
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
      business_member_id: member.id,
      status: "available",
    });
  }

  await supabaseAdmin
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", lookup.invitation.id);

  redirect(`/dashboard?business=${lookup.invitation.business_id}`);
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const lookup = await lookupInvitation(token);

  if (!lookup.ok) {
    const msg =
      lookup.reason === "expired" ? "This invitation has expired."
      : lookup.reason === "accepted" ? "This invitation has already been accepted."
      : "This invitation is no longer valid.";
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-semibold">Invitation unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
        <Link href="/login" className="mt-6 inline-block text-indigo-600 hover:underline">Go to log in</Link>
      </div>
    );
  }

  // Detect Path B: are we already authenticated as the invitee?
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const arrivedViaEmail =
    user && user.email?.toLowerCase() === lookup.invitation.email.toLowerCase();

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Join {lookup.business.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You&apos;ve been invited as <strong>{lookup.invitation.role.replace("_", " ")}</strong>.
        {arrivedViaEmail ? " Set a password and your name to finish joining." : " Set a password to create your Chrona account."}
      </p>

      {sp.error === "email_mismatch" && (
        <p className="mt-4 text-sm text-red-600">
          You&apos;re signed in with a different email than the invitation. Log out first, then click the invite link again.
        </p>
      )}

      <form action={arrivedViaEmail ? acceptAsCurrentUser : acceptAsNewAccount} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={lookup.invitation.email} readOnly disabled />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label htmlFor="first_name">First name</Label><Input id="first_name" name="first_name" required /></div>
          <div className="space-y-1.5"><Label htmlFor="last_name">Last name</Label><Input id="last_name" name="last_name" required /></div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>
        <Button type="submit" size="lg" className="w-full">Accept &amp; join</Button>
      </form>
    </div>
  );
}
