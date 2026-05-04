import "server-only";
import { cookies } from "next/headers";

export const SETUP_COOKIE = "chrona-setup";

export type BusinessStep = {
  name: string;
  founding_date: string;
  business_type: "self_employed" | "partnership" | "corporation";
  industry: string;
  services: string;
  employee_count_estimate: number;
  team_count_estimate: number;
};

export type AccountStep = {
  first_name: string;
  last_name: string;
  preferred_name: string;
  date_of_birth: string;
  gender: string;
  pronouns: string;
  personal_email: string;
  personal_phone: string;
  password: string;

  position: string;
  department_name: string;
  team_name: string;
  date_joined: string;
  company_email: string;
  work_phone: string;
  is_owner: boolean;

  partners: { email: string; share_percentage: number }[];
};

export type EmployeeRow = {
  first_name: string;
  last_name: string;
  personal_email: string;
  role: "employer" | "c_suite" | "manager" | "team_lead" | "employee";
  department: string;
  team: string;
  position: string;
  contract_type: "full_time" | "contract_3m" | "contract_6m" | "contract_12m" | "custom";
  contract_end_date: string | null;
  date_joined: string;
};

export type SetupState = {
  business?: BusinessStep;
  account?: AccountStep;
  employees?: EmployeeRow[];
};

export async function getSetupState(): Promise<SetupState> {
  const c = await cookies();
  const raw = c.get(SETUP_COOKIE)?.value;
  if (!raw) return {};
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as SetupState;
  } catch {
    return {};
  }
}

export async function saveSetupState(patch: Partial<SetupState>): Promise<void> {
  const c = await cookies();
  const current = await getSetupState();
  const next = { ...current, ...patch };
  const encoded = Buffer.from(JSON.stringify(next), "utf8").toString("base64");
  c.set(SETUP_COOKIE, encoded, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  });
}

export async function clearSetupState(): Promise<void> {
  const c = await cookies();
  c.delete(SETUP_COOKIE);
}
