import { redirect } from "next/navigation";
import { getSetupState, saveSetupState, type EmployeeRow } from "@/lib/business/setup";
import { WizardSteps } from "@/components/forms/WizardSteps";
import { EmployeesSignupForm } from "@/components/forms/EmployeesSignupForm";

async function saveEmployees(formData: FormData) {
  "use server";
  const employees: EmployeeRow[] = [];
  for (let i = 0; i < 20; i++) {
    const email = String(formData.get(`emp_email_${i}`) ?? "").trim();
    if (!email) continue;
    employees.push({
      first_name: String(formData.get(`emp_first_${i}`) ?? ""),
      last_name: String(formData.get(`emp_last_${i}`) ?? ""),
      personal_email: email,
      role: String(formData.get(`emp_role_${i}`) ?? "member") as EmployeeRow["role"],
      department: String(formData.get(`emp_dept_${i}`) ?? ""),
      team: String(formData.get(`emp_team_${i}`) ?? ""),
      position: String(formData.get(`emp_position_${i}`) ?? ""),
      contract_type: String(formData.get(`emp_contract_${i}`) ?? "full_time") as EmployeeRow["contract_type"],
      contract_end_date: String(formData.get(`emp_end_${i}`) ?? "") || null,
      date_joined: String(formData.get(`emp_joined_${i}`) ?? new Date().toISOString().slice(0, 10)),
    });
  }
  await saveSetupState({ employees });
  redirect("/signup/calendar");
}

export default async function EmployeesStep() {
  const state = await getSetupState();
  if (!state.workspace || !state.account) redirect("/signup/business");
  const existing = state.employees ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-6">
      <WizardSteps active="employees" />
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Add your team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Optional. Invitations will be sent to the personal emails listed below. You can also skip this and add team members later.
        </p>
      </div>

      <EmployeesSignupForm
        defaultValues={existing as EmployeeRow[]}
        saveAction={saveEmployees}
        skipUrl="/signup/calendar"
      />
    </div>
  );
}

