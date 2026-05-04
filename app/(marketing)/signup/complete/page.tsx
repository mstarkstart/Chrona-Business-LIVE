import { redirect } from "next/navigation";
import { getSetupState, clearSetupState } from "@/lib/business/setup";
import { finalizeSignup } from "@/lib/business/finalize";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WizardSteps } from "@/components/forms/WizardSteps";
import { Button } from "@/components/ui/button";

async function finishAction() {
  "use server";
  const state = await getSetupState();
  if (!state.business || !state.account) redirect("/signup/business");

  const { businessId } = await finalizeSignup(state);

  // Sign the user in immediately.
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signInWithPassword({
    email: state.account.personal_email,
    password: state.account.password,
  });

  await clearSetupState();
  redirect(`/dashboard?business=${businessId}`);
}

export default async function CompleteStep() {
  const state = await getSetupState();
  if (!state.business || !state.account) redirect("/signup/business");

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <WizardSteps active="complete" />
      <h1 className="text-2xl font-semibold">You&apos;re all set</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Review and finalise. We&apos;ll create <strong>{state.business.name}</strong>, your account,
        {state.employees?.length ? ` and send ${state.employees.length} employee invitation(s)` : ""}.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-6 space-y-2 text-sm">
        <div><strong>Business:</strong> {state.business.name} ({state.business.business_type.replace("_", " ")})</div>
        <div><strong>Account:</strong> {state.account.first_name} {state.account.last_name} — {state.account.personal_email}</div>
        {state.business.business_type === "partnership" && (
          <div><strong>Partners:</strong> {state.account.partners.length}</div>
        )}
        {state.employees && state.employees.length > 0 && (
          <div><strong>Employees:</strong> {state.employees.length} pending invitations</div>
        )}
      </div>

      <form action={finishAction} className="pt-6">
        <Button type="submit" size="lg">Create my business</Button>
      </form>
    </div>
  );
}
