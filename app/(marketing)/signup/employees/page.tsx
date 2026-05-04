import { redirect } from "next/navigation";
import { getSetupState, saveSetupState, type EmployeeRow } from "@/lib/business/setup";
import { WizardSteps } from "@/components/forms/WizardSteps";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
      role: String(formData.get(`emp_role_${i}`) ?? "employee") as EmployeeRow["role"],
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
  if (!state.business || !state.account) redirect("/signup/business");
  const existing = state.employees ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <WizardSteps active="employees" />
      <h1 className="text-2xl font-semibold">Add employees</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Optional. Each invitation goes to the personal email below. You can also add people later from Organisation.
      </p>

      <form action={saveEmployees} className="mt-6 space-y-3">
        {[0,1,2,3,4].map((i) => {
          const e = existing[i];
          return (
            <div key={i} className="grid grid-cols-[1fr_1fr_1.5fr_140px_1fr_1fr_140px] gap-2 items-end rounded-lg border border-border p-3">
              <div><Label className="text-xs">First</Label><Input name={`emp_first_${i}`} defaultValue={e?.first_name} /></div>
              <div><Label className="text-xs">Last</Label><Input name={`emp_last_${i}`} defaultValue={e?.last_name} /></div>
              <div><Label className="text-xs">Personal email</Label><Input name={`emp_email_${i}`} type="email" defaultValue={e?.personal_email} /></div>
              <div>
                <Label className="text-xs">Role</Label>
                <select name={`emp_role_${i}`} defaultValue={e?.role ?? "employee"} className="flex h-10 w-full rounded-lg border border-border bg-card px-2 text-sm">
                  <option value="employee">Employee</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="manager">Manager</option>
                  <option value="c_suite">C-Suite</option>
                </select>
              </div>
              <div><Label className="text-xs">Department</Label><Input name={`emp_dept_${i}`} defaultValue={e?.department} /></div>
              <div><Label className="text-xs">Team</Label><Input name={`emp_team_${i}`} defaultValue={e?.team} /></div>
              <div>
                <Label className="text-xs">Contract</Label>
                <select name={`emp_contract_${i}`} defaultValue={e?.contract_type ?? "full_time"} className="flex h-10 w-full rounded-lg border border-border bg-card px-2 text-sm">
                  <option value="full_time">Full-time</option>
                  <option value="contract_3m">3 months</option>
                  <option value="contract_6m">6 months</option>
                  <option value="contract_12m">12 months</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          );
        })}

        <div className="flex justify-between pt-3">
          <Link href="/signup/calendar"><Button variant="ghost" type="button">Skip</Button></Link>
          <Button type="submit" size="lg">Continue</Button>
        </div>
      </form>
    </div>
  );
}
