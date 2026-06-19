import { redirect } from "next/navigation";
import { saveSetupState, getSetupState } from "@/lib/business/setup";
import { WizardSteps } from "@/components/forms/WizardSteps";
import { BusinessSignupForm } from "@/components/forms/BusinessSignupForm";

async function saveBusiness(formData: FormData) {
  "use server";
  await saveSetupState({
    workspace: {
      name: String(formData.get("name") ?? "").trim(),
      founding_date: String(formData.get("founding_date") ?? ""),
      business_type: String(formData.get("business_type") ?? "self_employed") as "self_employed" | "partnership" | "corporation",
      industry: String(formData.get("industry") ?? ""),
      services: String(formData.get("services") ?? ""),
      employee_count_estimate: Number(formData.get("employee_count_estimate") ?? 1),
      team_count_estimate: Number(formData.get("team_count_estimate") ?? 1),
    },
  });
  redirect("/signup/account");
}

export default async function BusinessStep() {
  const state = await getSetupState();
  const b = state.workspace;
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 space-y-6">
      <WizardSteps active="business" />
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Tell us about your business</h1>
        <p className="text-sm text-muted-foreground">We will use this to set up your primary workspace and customize your tracking dashboard.</p>
      </div>
      <BusinessSignupForm defaultValues={b} saveAction={saveBusiness} />
    </div>
  );
}

