import Link from "next/link";
import { WizardSteps } from "@/components/forms/WizardSteps";
import { Button } from "@/components/ui/button";

export default function CalendarStep() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <WizardSteps active="calendar" />
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Chrona ships with a built-in calendar — no external sync required for v1.
        You&apos;ll be able to schedule meetings, focus blocks, breaks, and tasks directly from the app.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-medium">In-app calendar</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Today / Week / Month views, available-window detection, and per-team scheduling.
        </p>
      </div>

      <div className="pt-6">
        <Link href="/signup/complete"><Button size="lg">Continue</Button></Link>
      </div>
    </div>
  );
}
