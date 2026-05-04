import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          One workforce platform.
          <br />
          <span className="text-indigo-600">Every role. Every tool.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Chrona Business replaces the patchwork of calendars, task managers, and HR tools
          with one unified system that adapts to each role in your company.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link href="/signup"><Button size="xl">Start your business</Button></Link>
          <Link href="/login"><Button size="xl" variant="outline">Log in</Button></Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-24">
        {[
          {
            title: "Tailored to every role",
            body: "Five-tier role system from employer to employee — each gets exactly the dashboard, tools, and visibility their job needs.",
          },
          {
            title: "Tasks meet calendar",
            body: "Tasks, schedules, and live activity in one place. See where your team is, what they're on, and where the gaps are.",
          },
          {
            title: "Real-time everywhere",
            body: "Activity status, task updates, and approvals stream live across the business — no refresh button required.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
