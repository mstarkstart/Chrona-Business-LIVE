import { redirect } from "next/navigation";
import { getSetupState, saveSetupState, type AccountStep } from "@/lib/business/setup";
import { WizardSteps } from "@/components/forms/WizardSteps";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

async function saveAccount(formData: FormData) {
  "use server";

  // Partner rows are encoded as repeating fields partner_email_N + partner_share_N.
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
  if (!state.business) redirect("/signup/business");
  const a = state.account;
  const isPartnership = state.business.business_type === "partnership";

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <WizardSteps active="account" />
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="text-sm text-muted-foreground mt-1">You&apos;re creating the founding employer account for {state.business.name}.</p>

      <form action={saveAccount} className="mt-6 space-y-6">
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold">Personal info</legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="first_name">First name</Label><Input id="first_name" name="first_name" required defaultValue={a?.first_name} /></div>
            <div className="space-y-1.5"><Label htmlFor="last_name">Last name</Label><Input id="last_name" name="last_name" required defaultValue={a?.last_name} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="preferred_name">Preferred name</Label><Input id="preferred_name" name="preferred_name" defaultValue={a?.preferred_name} /></div>
            <div className="space-y-1.5"><Label htmlFor="date_of_birth">DOB</Label><Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={a?.date_of_birth} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="gender">Gender</Label><Input id="gender" name="gender" defaultValue={a?.gender} /></div>
            <div className="space-y-1.5"><Label htmlFor="pronouns">Pronouns</Label><Input id="pronouns" name="pronouns" defaultValue={a?.pronouns} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="personal_email">Personal email</Label><Input id="personal_email" name="personal_email" type="email" required defaultValue={a?.personal_email} /></div>
          <div className="space-y-1.5"><Label htmlFor="personal_phone">Personal phone</Label><Input id="personal_phone" name="personal_phone" defaultValue={a?.personal_phone} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold">Your role at {state.business.name}</legend>
          <div className="space-y-1.5"><Label htmlFor="position">Position / job title</Label><Input id="position" name="position" defaultValue={a?.position ?? "Founder"} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="department_name">Department (optional)</Label><Input id="department_name" name="department_name" defaultValue={a?.department_name} /></div>
            <div className="space-y-1.5"><Label htmlFor="team_name">Team (optional)</Label><Input id="team_name" name="team_name" defaultValue={a?.team_name} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="date_joined">Date joined</Label><Input id="date_joined" name="date_joined" type="date" defaultValue={a?.date_joined ?? new Date().toISOString().slice(0,10)} /></div>
            <div className="space-y-1.5"><Label htmlFor="company_email">Company email</Label><Input id="company_email" name="company_email" type="email" defaultValue={a?.company_email} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="work_phone">Work phone</Label><Input id="work_phone" name="work_phone" defaultValue={a?.work_phone} /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_owner" defaultChecked={a?.is_owner ?? true} />
            I am the owner of this business
          </label>
        </fieldset>

        {isPartnership && (
          <fieldset className="space-y-3 rounded-lg border border-border p-4">
            <legend className="text-sm font-semibold px-2">Add your partners</legend>
            <p className="text-xs text-muted-foreground">Partners will receive an email invitation to claim their account. Share % is informational.</p>
            {[0,1,2,3,4].map((i) => (
              <div key={i} className="grid grid-cols-[1fr_120px] gap-3">
                <Input name={`partner_email_${i}`} placeholder="partner@example.com" defaultValue={a?.partners?.[i]?.email} />
                <Input name={`partner_share_${i}`} type="number" min={0} max={100} placeholder="Share %" defaultValue={a?.partners?.[i]?.share_percentage} />
              </div>
            ))}
          </fieldset>
        )}

        <div className="pt-2">
          <Button type="submit" size="lg">Continue</Button>
        </div>
      </form>
    </div>
  );
}
