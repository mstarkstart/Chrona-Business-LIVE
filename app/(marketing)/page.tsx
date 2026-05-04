import Link from "next/link";

const FEATURES = [
  {
    icon: "⚡",
    title: "Real-time everything",
    body: "Activity status, task updates, and approvals broadcast live across your organisation — no refresh, no delay.",
  },
  {
    icon: "🎯",
    title: "Role-tailored dashboards",
    body: "Five tiers from founder to employee. Everyone sees exactly what they need and nothing they don't.",
  },
  {
    icon: "📅",
    title: "Smart scheduling",
    body: "Your calendar surfaces available windows automatically — no more 'when are you free?' emails.",
  },
  {
    icon: "🔒",
    title: "Bulletproof permissions",
    body: "Row-Level Security enforced at the database. A query from one company can never return another company's data.",
  },
  {
    icon: "🤝",
    title: "Partnership workflows",
    body: "Structural changes in a partnership business require majority approval before they execute. Built in, not bolted on.",
  },
  {
    icon: "🚀",
    title: "One tool, not five",
    body: "Calendar, tasks, HR tracker, team dashboard, and document store — all in one place with one login.",
  },
];

const ROLES = [
  { role: "Employer",  color: "#7c6af7", desc: "Company-wide visibility, full control" },
  { role: "C-Suite",   color: "#6366f1", desc: "Cross-department insights and oversight" },
  { role: "Manager",   color: "#8b5cf6", desc: "Department-level stats and task management" },
  { role: "Team Lead", color: "#a78bfa", desc: "Team progress and daily coordination" },
  { role: "Employee",  color: "#c4b5fd", desc: "Personal tasks, schedule, and progress" },
];

export default function LandingPage() {
  return (
    <div className="bg-mesh overflow-x-hidden">

      {/* ── Hero ── */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 py-32">

        {/* Background orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full"
               style={{ background: "radial-gradient(circle, rgba(124,106,247,0.18) 0%, transparent 70%)" }} />
          <div className="absolute top-20 left-10 w-[300px] h-[300px] rounded-full blur-3xl"
               style={{ background: "rgba(99,102,241,0.08)" }} />
          <div className="absolute top-40 right-10 w-[200px] h-[200px] rounded-full blur-3xl"
               style={{ background: "rgba(167,139,250,0.08)" }} />
        </div>

        {/* Badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300 mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
          Now in v1 — built for real businesses
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up delay-100 max-w-4xl text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08]">
          One platform for{" "}
          <span className="gradient-text text-glow">every role</span>
          {" "}in your company
        </h1>

        <p className="animate-fade-up delay-200 mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          Chrona Business replaces your calendar app, task manager, HR tool, and spreadsheets
          with a single system that adapts to how each person in your organisation actually works.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up delay-300 mt-10 flex flex-wrap gap-4 justify-center">
          <Link
            href="/signup"
            className="relative group inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-white shadow-lg glow-primary hover:brightness-110 active:scale-[0.98]"
          >
            Start your business free
            <svg className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-8 py-4 text-base font-semibold hover:bg-accent hover:border-violet-500/40"
          >
            Sign in
          </Link>
        </div>

        {/* Social proof */}
        <p className="animate-fade-up delay-400 mt-8 text-sm text-muted-foreground">
          No credit card. No verification. Set up in 10 minutes.
        </p>

        {/* Dashboard preview card */}
        <div className="animate-fade-up delay-400 mt-20 w-full max-w-5xl mx-auto">
          <div className="border-gradient rounded-2xl overflow-hidden shadow-2xl shadow-violet-950/50">
            <div className="bg-card/80 backdrop-blur-sm">
              {/* Fake window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <div className="ml-3 h-5 flex-1 max-w-xs rounded-md bg-muted text-xs text-muted-foreground flex items-center px-3">
                  chrona.business/dashboard
                </div>
              </div>
              {/* Fake dashboard */}
              <div className="p-6 grid grid-cols-3 gap-4">
                {[
                  { label: "Tasks complete", value: "84%", bar: 84, color: "#7c6af7" },
                  { label: "Active employees", value: "12", bar: 100, color: "#22c55e" },
                  { label: "Pending approvals", value: "2", bar: 20, color: "#f97316" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-muted/40 border border-border p-4">
                    <div className="text-xs text-muted-foreground mb-2">{stat.label}</div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                           style={{ width: `${stat.bar}%`, background: stat.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-2">
                  <div className="text-xs text-muted-foreground font-medium">Live activity</div>
                  {[
                    { name: "Olivia Carter", status: "Tasking", color: "#eab308" },
                    { name: "Marcus Lee", status: "Meeting", color: "#f97316" },
                    { name: "Sam Park", status: "Available", color: "#22c55e" },
                  ].map((p) => (
                    <div key={p.name} className="flex items-center gap-2 text-sm">
                      <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                      <span>{p.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{p.status}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-2">
                  <div className="text-xs text-muted-foreground font-medium">Priority tasks</div>
                  {[
                    { title: "Q3 roadmap proposal", priority: "urgent", color: "#ef4444" },
                    { title: "Design system audit", priority: "high", color: "#f97316" },
                    { title: "Customer demo prep", priority: "normal", color: "#22c55e" },
                  ].map((t) => (
                    <div key={t.title} className="flex items-center gap-2 text-sm">
                      <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Built for every tier</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              One platform, five role levels. Each person sees exactly the scope, tools, and data their job needs — and nothing else.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {ROLES.map((r, i) => (
              <div
                key={r.role}
                className="glass rounded-2xl px-6 py-5 flex items-center gap-5 card-hover"
                style={{ paddingLeft: `${1.5 + i * 0.5}rem` }}
              >
                <div className="h-3 w-3 rounded-full shrink-0" style={{ background: r.color,
                  boxShadow: `0 0 12px ${r.color}` }} />
                <div className="font-semibold w-28 shrink-0" style={{ color: r.color }}>{r.role}</div>
                <div className="text-sm text-muted-foreground">{r.desc}</div>
                <div className="ml-auto text-muted-foreground/40">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Everything your company needs.{" "}
              <span className="gradient-text">Nothing it doesn&apos;t.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass rounded-2xl p-6 card-hover">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="border-gradient rounded-3xl p-px">
            <div className="rounded-3xl bg-card/60 backdrop-blur-sm px-10 py-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to run your business{" "}
                <span className="gradient-text">smarter?</span>
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Get started in minutes. No credit card, no setup fees, no limits on users in v1.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-10 py-4 text-base font-semibold text-white glow-primary hover:brightness-110 active:scale-[0.98]"
              >
                Create your business
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
