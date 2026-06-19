"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserPlus, Mail, Shield, Trash2, Calendar, Folder, Users, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type EmployeeRow = {
  first_name: string;
  last_name: string;
  personal_email: string;
  role: "owner" | "admin" | "manager" | "member" | "guest";
  department: string;
  team: string;
  position: string;
  contract_type: "full_time" | "contract_3m" | "contract_6m" | "contract_12m" | "custom";
  contract_end_date: string | null;
  date_joined: string;
};

export function EmployeesSignupForm({
  defaultValues,
  saveAction,
  skipUrl,
}: {
  defaultValues: EmployeeRow[];
  saveAction: (formData: FormData) => Promise<void>;
  skipUrl: string;
}) {
  const router = useRouter();
  const [employees, setEmployees] = useState<Partial<EmployeeRow>[]>(
    defaultValues.length > 0
      ? defaultValues
      : [
          {
            first_name: "",
            last_name: "",
            personal_email: "",
            role: "member",
            department: "",
            team: "",
            position: "",
            contract_type: "full_time",
            date_joined: new Date().toISOString().slice(0, 10),
          },
        ]
  );

  const [quickEmail, setQuickEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleQuickInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEmail) return;

    if (!validateEmail(quickEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setEmailError("");
    // Add new row with defaults
    setEmployees([
      ...employees,
      {
        first_name: "",
        last_name: "",
        personal_email: quickEmail,
        role: "member",
        department: "General",
        team: "All",
        position: "Associate",
        contract_type: "full_time",
        date_joined: new Date().toISOString().slice(0, 10),
      },
    ]);
    setQuickEmail("");
  };

  const addRow = () => {
    if (employees.length >= 20) return;
    setEmployees([
      ...employees,
      {
        first_name: "",
        last_name: "",
        personal_email: "",
        role: "member",
        department: "",
        team: "",
        position: "",
        contract_type: "full_time",
        date_joined: new Date().toISOString().slice(0, 10),
      },
    ]);
  };

  const removeRow = (index: number) => {
    setEmployees(employees.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof EmployeeRow, value: any) => {
    const next = [...employees];
    next[index] = { ...next[index], [field]: value };
    setEmployees(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Quick Invite Box */}
      <div className="bg-white/80 backdrop-blur-md border border-border rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <UserPlus className="h-4.5 w-4.5 text-primary" /> Instant Invite by Email
        </h3>
        <form onSubmit={handleQuickInvite} className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground/60" />
            <Input
              value={quickEmail}
              onChange={(e) => {
                setQuickEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              placeholder="Enter coworker's email address..."
              className="pl-10 h-11 rounded-xl focus:bg-white"
            />
          </div>
          <Button type="submit" className="h-11 rounded-xl px-5 bg-indigo-50 hover:bg-indigo-100 text-primary font-bold cursor-pointer">
            Add Row
          </Button>
        </form>
        {emailError && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-500 font-semibold"
          >
            {emailError}
          </motion.p>
        )}
      </div>

      <form action={saveAction} className="space-y-4">
        {/* Render hidden inputs for form serialization */}
        {employees.map((emp, i) => (
          <div key={i}>
            <input type="hidden" name={`emp_first_${i}`} value={emp.first_name ?? ""} />
            <input type="hidden" name={`emp_last_${i}`} value={emp.last_name ?? ""} />
            <input type="hidden" name={`emp_email_${i}`} value={emp.personal_email ?? ""} />
            <input type="hidden" name={`emp_role_${i}`} value={emp.role ?? "member"} />
            <input type="hidden" name={`emp_dept_${i}`} value={emp.department ?? ""} />
            <input type="hidden" name={`emp_team_${i}`} value={emp.team ?? ""} />
            <input type="hidden" name={`emp_position_${i}`} value={emp.position ?? ""} />
            <input type="hidden" name={`emp_contract_${i}`} value={emp.contract_type ?? "full_time"} />
            <input type="hidden" name={`emp_joined_${i}`} value={emp.date_joined ?? ""} />
          </div>
        ))}

        {/* Employee Cards List */}
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {employees.map((emp, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white/80 backdrop-blur-md border border-border rounded-2xl p-5 shadow-sm space-y-4 relative"
              >
                {/* Header / Remove */}
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/50">
                    Employee #{i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-muted-foreground hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">First Name</Label>
                    <Input
                      placeholder="e.g. Jane"
                      value={emp.first_name}
                      onChange={(e) => updateRow(i, "first_name", e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Name</Label>
                    <Input
                      placeholder="e.g. Smith"
                      value={emp.last_name}
                      onChange={(e) => updateRow(i, "last_name", e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Personal Email</Label>
                    <Input
                      type="email"
                      required
                      placeholder="jane.smith@example.com"
                      value={emp.personal_email}
                      onChange={(e) => updateRow(i, "personal_email", e.target.value)}
                      className={`h-10 rounded-xl ${
                        emp.personal_email && !validateEmail(emp.personal_email)
                          ? "border-red-300 focus:ring-red-200"
                          : ""
                      }`}
                    />
                  </div>

                  {/* Role Selector Badges */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5" /> Role Badge
                    </Label>
                    <div className="flex gap-2">
                      {(["member", "manager", "admin", "guest"] as const).map((r) => {
                        const active = emp.role === r;
                        let badgeStyle = "border-border text-muted-foreground hover:bg-muted";
                        if (active) {
                          if (r === "admin") badgeStyle = "bg-red-50 text-red-700 border-red-200 ring-2 ring-red-100";
                          else if (r === "manager") badgeStyle = "bg-amber-50 text-amber-700 border-amber-200 ring-2 ring-amber-100";
                          else if (r === "guest") badgeStyle = "bg-gray-50 text-gray-700 border-gray-200 ring-2 ring-gray-100";
                          else badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200 ring-2 ring-indigo-100";
                        }
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => updateRow(i, "role", r)}
                            className={`flex-1 py-1.5 px-2.5 rounded-xl border text-[11px] font-bold capitalize transition-all cursor-pointer ${badgeStyle}`}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contract Dropdown */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Contract Type
                    </Label>
                    <select
                      value={emp.contract_type}
                      onChange={(e) => updateRow(i, "contract_type", e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-border bg-card px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="full_time">Full-time</option>
                      <option value="contract_3m">3 months contract</option>
                      <option value="contract_6m">6 months contract</option>
                      <option value="contract_12m">12 months contract</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Folder className="h-3.5 w-3.5" /> Department
                    </Label>
                    <Input
                      placeholder="e.g. Sales"
                      value={emp.department}
                      onChange={(e) => updateRow(i, "department", e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> Team
                    </Label>
                    <Input
                      placeholder="e.g. Enterprise"
                      value={emp.team}
                      onChange={(e) => updateRow(i, "team", e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-border">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              onClick={() => router.back()}
              variant="ghost"
              className="h-11 px-4 rounded-xl text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              type="button"
              onClick={addRow}
              disabled={employees.length >= 20}
              className="flex-1 sm:flex-initial h-11 px-5 rounded-xl border border-border hover:bg-muted text-foreground font-bold cursor-pointer"
            >
              Add Another Employee
            </Button>
            <Button
              type="button"
              onClick={() => window.location.href = skipUrl}
              className="flex-1 sm:flex-initial h-11 px-5 rounded-xl bg-transparent hover:bg-muted text-muted-foreground font-bold border border-transparent cursor-pointer"
            >
              Skip
            </Button>
          </div>

          <Button
            type="submit"
            className="w-full sm:w-auto px-8 h-11 rounded-xl bg-primary text-white font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Continue
            <ChevronRight className="h-4.5 w-4.5" />
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
