import { redirect } from "next/navigation";
import { getSetupState, clearSetupState } from "@/lib/business/setup";
import { finalizeSignup } from "@/lib/business/finalize";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WizardSteps } from "@/components/forms/WizardSteps";
import { CompleteSignupForm } from "@/components/forms/CompleteSignupForm";

async function finishAction() {
  "use server";
  try {
    const state = await getSetupState();
    if (!state.workspace || !state.account) {
      return { success: false, error: "Setup state is incomplete." };
    }

    const { businessId } = await finalizeSignup(state);

    // Sign the user in immediately.
    const supabase = await createSupabaseServerClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: state.account.personal_email,
      password: state.account.password,
    });
    if (signInErr) {
      return { success: false, error: `Login failed: ${signInErr.message}` };
    }

    await clearSetupState();
    return { success: true, businessId };
  } catch (err: any) {
    console.error("Signup finalisation failed:", err);
    return { success: false, error: err?.message ?? "An unexpected error occurred." };
  }
}

export default async function CompleteStep() {
  const state = await getSetupState();
  if (!state.workspace || !state.account) redirect("/signup/business");

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 space-y-6">
      <WizardSteps active="complete" />
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">You&apos;re all set</h1>
        <p className="text-sm text-muted-foreground">
          Review your configurations. Once confirmed, we will create your business and generate the member invitations.
        </p>
      </div>

      <CompleteSignupForm
        workspace={state.workspace}
        account={state.account}
        employeeCount={state.employees?.length ?? 0}
        finishAction={finishAction}
      />
    </div>
  );
}

