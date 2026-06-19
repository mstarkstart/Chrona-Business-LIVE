import { WizardSteps } from "@/components/forms/WizardSteps";
import { CalendarStepClient } from "./client";

export default function CalendarStep() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <WizardSteps active="calendar" />
      <CalendarStepClient />
    </div>
  );
}
