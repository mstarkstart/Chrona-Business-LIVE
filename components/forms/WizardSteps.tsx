import { cn } from "@/lib/utils";

const STEPS = [
  { key: "business", label: "Business" },
  { key: "account",  label: "Account" },
  { key: "employees", label: "Employees" },
  { key: "calendar", label: "Calendar" },
  { key: "complete", label: "Complete" },
];

export function WizardSteps({ active }: { active: string }) {
  const idx = STEPS.findIndex((s) => s.key === active);
  return (
    <ol className="flex items-center gap-3 mb-8">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <div
            className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border",
              i < idx && "bg-indigo-600 text-white border-indigo-600",
              i === idx && "bg-indigo-50 text-indigo-700 border-indigo-300",
              i > idx && "bg-card text-muted-foreground border-border"
            )}
          >
            {i + 1}
          </div>
          <span className={cn(
            "text-sm",
            i === idx ? "font-medium text-foreground" : "text-muted-foreground"
          )}>
            {s.label}
          </span>
          {i < STEPS.length - 1 && <span className="w-6 h-px bg-border" />}
        </li>
      ))}
    </ol>
  );
}
