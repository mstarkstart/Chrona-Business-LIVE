import { redirect } from "next/navigation";
import { saveSetupState, getSetupState } from "@/lib/business/setup";
import { WizardSteps } from "@/components/forms/WizardSteps";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

async function saveBusiness(formData: FormData) {
  "use server";
  await saveSetupState({
    business: {
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
  const b = state.business;
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <WizardSteps active="business" />
      <h1 className="text-2xl font-semibold">Tell us about your business</h1>
      <form action={saveBusiness} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Business name</Label>
          <Input id="name" name="name" required defaultValue={b?.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="founding_date">Founding date</Label>
          <Input id="founding_date" name="founding_date" type="date" defaultValue={b?.founding_date} />
        </div>
        <div className="space-y-1.5">
          <Label>Business type</Label>
          <div className="flex gap-3">
            {(["self_employed","partnership","corporation"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-accent">
                <input
                  type="radio"
                  name="business_type"
                  value={t}
                  required
                  defaultChecked={(b?.business_type ?? "self_employed") === t}
                />
                <span className="text-sm capitalize">{t.replace("_", " ")}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="industry">Industry</Label>
          <select
            id="industry" name="industry"
            defaultValue={b?.industry ?? "Tech"}
            className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            {["Automotive","Restaurant","Retail","Tech","Healthcare","Other"].map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="services">Services / description</Label>
          <textarea
            id="services" name="services"
            defaultValue={b?.services}
            rows={3}
            className="flex w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="employee_count_estimate">Estimated employees</Label>
            <Input id="employee_count_estimate" name="employee_count_estimate" type="number" min={1} defaultValue={b?.employee_count_estimate ?? 1} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team_count_estimate">Estimated teams</Label>
            <Input id="team_count_estimate" name="team_count_estimate" type="number" min={1} defaultValue={b?.team_count_estimate ?? 1} />
          </div>
        </div>
        <div className="pt-2">
          <Button type="submit" size="lg">Continue</Button>
        </div>
      </form>
    </div>
  );
}
