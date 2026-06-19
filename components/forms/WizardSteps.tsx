import { getSetupState } from "@/lib/business/setup";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { key: "business", label: "Business" },
  { key: "account",  label: "Account" },
  { key: "employees", label: "Employees" },
  { key: "calendar", label: "Calendar" },
  { key: "complete", label: "Complete" },
];

export async function WizardSteps({ active }: { active: string }) {
  const state = await getSetupState();
  const idx = STEPS.findIndex((s) => s.key === active);

  const getStepSummary = (key: string) => {
    switch (key) {
      case "business":
        return state.workspace?.name ? state.workspace.name : "Company info";
      case "account":
        return state.account?.first_name
          ? `${state.account.first_name} ${state.account.last_name.slice(0, 1)}.`
          : "Owner account";
      case "employees":
        return state.employees && state.employees.length > 0
          ? `${state.employees.length} invitee(s)`
          : "Add coworkers";
      case "calendar":
        return "Internal calendar";
      case "complete":
        return "Launch portal";
      default:
        return "";
    }
  };

  return (
    <div className="w-full py-4 mb-8">
      {/* Visual step tracker */}
      <ol className="flex items-start justify-between w-full relative">
        {STEPS.map((s, i) => {
          const isCompleted = i < idx;
          const isCurrent = i === idx;
          const isFuture = i > idx;

          return (
            <li key={s.key} className="flex flex-col items-center flex-1 relative group">
              {/* Connecting Line */}
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "absolute top-5 left-[50%] right-[-50%] h-0.5 z-0 transition-colors duration-500",
                    i < idx ? "bg-indigo-600" : "bg-border"
                  )}
                />
              )}

              {/* Indicator Dot */}
              <div className="relative z-10 flex items-center justify-center">
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300",
                    isCompleted && "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100",
                    isCurrent && "bg-white text-indigo-600 border-indigo-600 ring-4 ring-indigo-100 shadow-md",
                    isFuture && "bg-white text-muted-foreground border-border"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 stroke-[2.5]" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                {isCurrent && (
                  <span className="absolute inset-0 rounded-full h-10 w-10 border border-indigo-500 animate-ping opacity-75" />
                )}
              </div>

              {/* Text descriptions */}
              <div className="text-center mt-3 max-w-[120px] px-1 space-y-0.5">
                <span
                  className={cn(
                    "text-xs font-bold tracking-tight block transition-colors",
                    isCurrent ? "text-indigo-600" : "text-foreground"
                  )}
                >
                  {s.label}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium block truncate">
                  {getStepSummary(s.key)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
