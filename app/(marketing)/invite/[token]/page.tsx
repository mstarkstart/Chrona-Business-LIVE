import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { lookupInvitation, acceptInvitation } from "@/lib/business/invitations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/auth/session";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BarChart3, ArrowRight, Shield, CheckCircle, Info } from "lucide-react";

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

  // Pin the new workspace as active so the dashboard loads correctly
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, businessId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect(`/dashboard?new_member=1`);
}

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

  await supabase.auth.updateUser({ password });

  await supabaseAdmin.from("profiles").upsert({
    id: user.id,
    first_name: first,
    last_name: last,
    personal_email: lookup.invitation.email,
  });

  const { data: member } = await supabaseAdmin
    .from("workspace_members")
    .insert({
      workspace_id: lookup.invitation.workspace_id,
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
      workspace_member_id: member.id,
      status: "available",
    });
  }

  await supabaseAdmin
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", lookup.invitation.id);

  // Pin the new workspace as active cookie
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, lookup.invitation.workspace_id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect(`/dashboard?new_member=1`);
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
      <div className="min-h-[calc(100vh-5rem)] bg-mesh flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md border-gradient rounded-3xl p-px shadow-xl">
          <div className="rounded-3xl bg-white px-8 py-10 text-center space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Invitation Unavailable</h1>
            <p className="text-sm text-muted-foreground">{msg}</p>
            <Link href="/login" className="inline-block text-indigo-600 font-semibold hover:underline">
              Go to log in &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const arrivedViaEmail =
    user && user.email?.toLowerCase() === lookup.invitation.email.toLowerCase();

  // Define role description text & permissions
  const getRoleInfo = (role: string) => {
    switch (role) {
      case "owner":
        return {
          desc: "Full administrative control over workspace members, task settings, automations, and integration setup.",
          perms: ["Full workspace access", "Invite/remove team members", "Configure integrations", "Advanced options"],
        };
      case "admin":
        return {
          desc: "High-level access to configure tasks, manage board stages, and invite new employees to departments.",
          perms: ["Manage workspace members", "Create and assign tasks", "Access advanced settings", "Configure projects"],
        };
      case "manager":
        return {
          desc: "Operational access to assign work, monitor workloads, and keep tabs on project milestones.",
          perms: ["Create and assign tasks", "View workload dashboard", "Manage team boards", "Write comments"],
        };
      case "member":
        return {
          desc: "Standard collaborative access to complete assignments, track time, and chat with team members.",
          perms: ["Create and execute tasks", "Submit activity updates", "Log working time", "Write comments"],
        };
      case "guest":
        return {
          desc: "Observer-level access, allowing you to review specific tasks, track milestones, and post feedback comments.",
          perms: ["View assigned tasks & boards", "Submit feedback comments", "ReadOnly workspace settings"],
        };
      default:
        return {
          desc: "Standard workspace collaborator access.",
          perms: ["Access shared dashboards", "Collaborate on tasks"],
        };
    }
  };

  const roleInfo = getRoleInfo(lookup.invitation.role);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-mesh relative flex items-center justify-center px-6 py-16 overflow-hidden">
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full opacity-50 blur-3xl animate-blob"
             style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%)" }} />
        <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full opacity-50 blur-3xl animate-blob"
             style={{ background: "radial-gradient(circle, rgba(244,63,94,0.10), transparent 70%)", animationDelay: "3s" }} />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 bg-grid mask-fade opacity-40" />

      <div className="relative w-full max-w-xl animate-fade-up">
        <div className="border-gradient rounded-3xl p-px shadow-2xl shadow-indigo-200/50">
          <div className="rounded-3xl bg-white/80 backdrop-blur-md px-8 py-10 space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter">Join {lookup.workspace.name}</h1>
              <p className="text-sm text-muted-foreground">
                You&apos;ve been invited to join the workforce as a{" "}
                <span className="font-bold text-indigo-600 capitalize bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/50">
                  {lookup.invitation.role.replace("_", " ")}
                </span>.
              </p>
            </div>

            {sp.error === "email_mismatch" && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 animate-shake">
                You&apos;re signed in with a different email than the invitation. Log out first, then click the invite link again.
              </div>
            )}

            {/* Main Content Layout (Form + Role Details Side-by-Side on desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Form Side */}
              <form
                action={arrivedViaEmail ? acceptAsCurrentUser : acceptAsNewAccount}
                className="space-y-4 md:col-span-7"
              >
                <input type="hidden" name="token" value={token} />
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                  <Input value={lookup.invitation.email} readOnly disabled className="h-10 rounded-xl bg-muted/50 cursor-not-allowed" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="first_name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">First name</Label>
                    <Input id="first_name" name="first_name" required className="h-10 rounded-xl focus:bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="last_name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last name</Label>
                    <Input id="last_name" name="last_name" required className="h-10 rounded-xl focus:bg-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Choose Password</Label>
                  <Input id="password" name="password" type="password" minLength={8} required className="h-10 rounded-xl focus:bg-white" />
                </div>
                <Button type="submit" size="lg" className="w-full h-11 rounded-xl bg-primary text-white font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer">
                  Accept &amp; Join
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>

              {/* Role Details Side */}
              <div className="space-y-4 md:col-span-5 bg-indigo-50/25 border border-indigo-100/50 rounded-2xl p-4.5">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-indigo-500" /> Role Permissions
                </h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {roleInfo.desc}
                </p>
                <ul className="space-y-2 pt-1">
                  {roleInfo.perms.map((perm, pidx) => (
                    <li key={pidx} className="flex items-center gap-1.5 text-[11px] text-foreground font-semibold">
                      <CheckCircle className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span>{perm}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-2 border-t border-indigo-100 flex items-start gap-1.5 text-[9px] text-muted-foreground/80">
                  <Info className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span>Your position is listed as: <strong className="text-foreground capitalize">{lookup.invitation.position || "Associate"}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

