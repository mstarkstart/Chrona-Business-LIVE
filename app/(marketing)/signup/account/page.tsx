import { redirect } from "next/navigation";
import { getSetupState, saveSetupState, type AccountStep } from "@/lib/business/setup";
import { WizardSteps } from "@/components/forms/WizardSteps";
import { AccountSignupForm } from "@/components/forms/AccountSignupForm";

async function saveAccount(formData: FormData) {
  "use server";

  const partners: AccountStep["partners"] = [];
  for (let i = 0; i < 10; i++) {
    const email = String(formData.get(`partner_email_${i}`) ?? "").trim();
    const share = Number(formData.get(`partner_share_${i}`) ?? 0);
    if (email) partners.push({ email, share_percentage: share || 0 });
  }

  await saveSetupState({
    account: {
      first_name: String(formData.get("first_name") ?? "").trim(),
      last_name: String(formData.get("last_name") ?? "").trim(),
      preferred_name: String(formData.get("preferred_name") ?? ""),
      date_of_birth: String(formData.get("date_of_birth") ?? ""),
      gender: String(formData.get("gender") ?? ""),
      pronouns: String(formData.get("pronouns") ?? ""),
      personal_email: String(formData.get("personal_email") ?? "").trim(),
      personal_phone: String(formData.get("personal_phone") ?? ""),
      password: String(formData.get("password") ?? ""),

      position: String(formData.get("position") ?? ""),
      department_name: String(formData.get("department_name") ?? ""),
      team_name: String(formData.get("team_name") ?? ""),
      date_joined: String(formData.get("date_joined") ?? ""),
      company_email: String(formData.get("company_email") ?? ""),
      work_phone: String(formData.get("work_phone") ?? ""),
      is_owner: formData.get("is_owner") === "on",

      partners,
    },
  });

  redirect("/signup/employees");
}

export default async function AccountStepPage() {
  const state = await getSetupState();
  if (!state.workspace) redirect("/signup/business");
  const a = state.account;
  const isPartnership = state.workspace.business_type === "partnership";

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 space-y-6">
      <WizardSteps active="account" />
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          You&apos;re creating the founding employer account for <strong>{state.workspace.name}</strong>.
        </p>
      </div>

      <AccountSignupForm
        defaultValues={a}
        isPartnership={isPartnership}
        businessName={state.workspace.name}
        saveAction={saveAccount}
      />
    </div>
  );
}

