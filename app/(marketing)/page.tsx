import Link from "next/link";
import { ArrowRight, Sparkles, Zap, ShieldCheck, Calendar, Users, BarChart3, CheckCircle2, Clock } from "lucide-react";
import { HeroMockup } from "@/components/marketing/HeroMockup";
import { LiveTicker } from "@/components/marketing/LiveTicker";
import { AnimatedCounter } from "@/components/marketing/AnimatedCounter";
import { RoleCarousel } from "@/components/marketing/RoleCarousel";

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO                                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-mesh">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-60 blur-3xl animate-blob"
               style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)" }} />
          <div className="absolute top-40 -right-32 w-[420px] h-[420px] rounded-full opacity-50 blur-3xl animate-blob"
               style={{ background: "radial-gradient(circle, rgba(244,63,94,0.10) 0%, transparent 70%)", animationDelay: "3s" }} />
          <div className="absolute -bottom-20 left-1/3 w-[360px] h-[360px] rounded-full opacity-50 blur-3xl animate-blob"
               style={{ background: "radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)", animationDelay: "6s" }} />
        </div>

        {/* Subtle grid */}
        <div className="absolute inset-0 bg-grid mask-fade opacity-50" />

        <div className="relative pt-28 pb-24 px-6">
          <div className="mx-auto max-w-6xl text-center">

            {/* Badge */}
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm">
              <Sparkles className="h-3 w-3" />
              <span>Now in v1</span>
              <span className="h-1 w-1 rounded-full bg-indigo-300" />
              <span className="text-indigo-500">Built for real businesses</span>
            </div>

            {/* Headline */}
            <h1 className="animate-fade-up delay-100 mt-8 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tightest leading-[0.95]">
              Run your business
              <br />
              <span className="gradient-text">in one place.</span>
            </h1>

            <p className="animate-fade-up delay-200 mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Tasks, calendar, dashboards, real-time activity, role-based access — all in one beautifully crafted system that adapts to every person in your company.
            </p>

            {/* CTAs */}
            <div className="animate-fade-up delay-300 mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="group relative inline-flex items-center gap-2 rounded-2xl bg-primary px-7 py-4 text-base font-semibold text-white shadow-lg glow-primary hover:scale-[1.02] active:scale-[0.98]"
              >
                Start your business — free
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white/80 backdrop-blur-sm px-7 py-4 text-base font-semibold hover:bg-white hover:shadow-md hover:border-indigo-200"
              >
                Sign in
              </Link>
            </div>

            {/* Trust line */}
            <p className="animate-fade-up delay-400 mt-6 text-sm text-muted-foreground">
              <span className="text-emerald-600 font-semibold">✓</span> No credit card{"  "}·{"  "}
              <span className="text-emerald-600 font-semibold">✓</span> 10-minute setup{"  "}·{"  "}
              <span className="text-emerald-600 font-semibold">✓</span> Cancel anytime
            </p>

            {/* Mockup */}
            <div className="animate-fade-up delay-500 mt-20 relative max-w-5xl mx-auto">
              <div className="mockup-tilt">
                <HeroMockup />
              </div>

              {/* Floating annotation cards */}
              <div className="hidden md:block absolute -left-12 top-32 animate-float">
                <div className="rounded-2xl bg-white border border-border shadow-xl px-4 py-3 flex items-center gap-3 max-w-[220px]">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">12 tasks done</div>
                    <div className="text-[10px] text-muted-foreground">today, on track</div>
                  </div>
                </div>
              </div>

              <div className="hidden md:block absolute -right-8 top-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: "1.5s" }}>
                <div className="rounded-2xl bg-white border border-border shadow-xl px-4 py-3 flex items-center gap-3 max-w-[240px]">
                  <div className="relative h-9 w-9 shrink-0">
                    <div className="absolute inset-0 rounded-full bg-amber-400 animate-pulse-soft" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Sam Park is tasking</div>
                    <div className="text-[10px] text-muted-foreground">live, just now</div>
                  </div>
                </div>
              </div>

              <div className="hidden md:block absolute -left-8 -bottom-6 animate-float" style={{ animationDelay: "3s" }}>
                <div className="rounded-2xl bg-white border border-border shadow-xl px-4 py-3 flex items-center gap-3 max-w-[240px]">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">2h 30m available</div>
                    <div className="text-[10px] text-muted-foreground">today, after lunch</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STATS BAR                                                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative py-20 px-6 border-y border-border bg-white/50">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 5,    suffix: "",   label: "role tiers", color: "#4f46e5" },
            { value: 100,  suffix: "%",  label: "real-time", color: "#10b981" },
            { value: 27,   suffix: "+",  label: "screens",  color: "#f97316" },
            { value: 0,    suffix: "",   label: "data leaks ever", color: "#f43f5e" },
          ].map((s, i) => (
            <div key={i} className="text-center animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="text-5xl md:text-6xl font-bold tracking-tighter" style={{ color: s.color }}>
                <AnimatedCounter to={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ROLE EXPLORER                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-32 px-6 bg-mesh relative overflow-hidden">
        <div className="absolute -top-40 right-0 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl"
             style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)" }} />

        <div className="relative mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 mb-5">
              <Users className="h-3 w-3" />
              FIVE-TIER ROLE SYSTEM
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">
              One product.{" "}
              <span className="gradient-text">Different shape for everyone.</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              From founder to employee — each person sees exactly what their role demands. No clutter, no information overload, no permission tickets.
            </p>
          </div>

          <RoleCarousel />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BENTO FEATURES                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-32 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 mb-5">
              <Zap className="h-3 w-3" />
              EVERYTHING YOU NEED
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">
              Five tools.{" "}
              <span className="gradient-text-warm">One product.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Tasks — large */}
            <div className="md:col-span-2 group rounded-3xl border border-border bg-white p-8 card-soft overflow-hidden relative">
              <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-indigo-50 blur-3xl opacity-60" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold">Smart task management</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  Create, assign, approve. The system suggests the right person based on workload — you make the final call.
                </p>
                <div className="space-y-2">
                  {[
                    { title: "Q3 roadmap proposal", color: "#ef4444", priority: "Urgent" },
                    { title: "Design system audit", color: "#f97316", priority: "High" },
                    { title: "Customer demo prep",  color: "#10b981", priority: "Normal" },
                  ].map((t) => (
                    <div key={t.title} className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3 group-hover:translate-x-1 transition-transform">
                      <div className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                      <span className="font-medium text-sm flex-1">{t.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${t.color}15`, color: t.color }}>
                        {t.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="rounded-3xl border border-border bg-white p-8 card-soft overflow-hidden relative">
              <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-rose-50 blur-3xl opacity-60" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-rose-600" />
                  </div>
                  <h3 className="text-xl font-bold">Smart calendar</h3>
                </div>
                <p className="text-muted-foreground mb-6 text-sm">
                  Available windows surface automatically. No more chasing for a free hour.
                </p>
                <div className="grid grid-cols-7 gap-1">
                  {[..."MTWTFSS"].map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground">{d}</div>
                  ))}
                  {Array.from({ length: 28 }).map((_, i) => {
                    const isToday = i === 11;
                    const hasEvents = [3, 7, 11, 15, 18, 22].includes(i);
                    const heavy = [11, 15].includes(i);
                    return (
                      <div
                        key={i}
                        className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium ${
                          isToday
                            ? "bg-indigo-600 text-white shadow-md"
                            : hasEvents
                              ? heavy ? "bg-indigo-100 text-indigo-700" : "bg-indigo-50 text-indigo-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {((i + 1) % 30) || 30}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Real-time activity */}
            <div className="rounded-3xl border border-border bg-white p-8 card-soft overflow-hidden relative">
              <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-emerald-50 blur-3xl opacity-60" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <div className="relative h-2.5 w-2.5">
                      <div className="absolute inset-0 rounded-full bg-emerald-500" />
                      <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold">Real-time everything</h3>
                </div>
                <p className="text-muted-foreground text-sm mb-6">
                  Activity status, task updates, approvals — broadcast live across your team.
                </p>
                <div className="space-y-2">
                  {[
                    { name: "Olivia",  status: "Tasking",   color: "#eab308" },
                    { name: "Marcus",  status: "Meeting",   color: "#f97316" },
                    { name: "Sam",     status: "Available", color: "#10b981" },
                  ].map((p) => (
                    <div key={p.name} className="flex items-center gap-2 text-sm">
                      <div className="relative h-2 w-2 shrink-0">
                        <div className="absolute inset-0 rounded-full" style={{ background: p.color }} />
                        <div className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: p.color }} />
                      </div>
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Approvals — wider */}
            <div className="md:col-span-2 rounded-3xl border border-border bg-gradient-to-br from-violet-50 via-white to-indigo-50/50 p-8 card-soft overflow-hidden relative">
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-violet-600" />
                  </div>
                  <h3 className="text-xl font-bold">Bulletproof permissions</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  Row-level security at the database level. A query from one company can never return another company&apos;s data — physically impossible.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { label: "Auth",        ok: true },
                    { label: "RLS",         ok: true },
                    { label: "Realtime",    ok: true },
                    { label: "Approvals",   ok: true },
                    { label: "Audit log",   ok: true },
                    { label: "Multi-tenant", ok: true },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center gap-2 rounded-lg bg-white border border-border px-3 py-2 text-xs font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      {f.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* LIVE TICKER DEMO                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid mask-fade opacity-30" />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                LIVE
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-5">
                See your team{" "}
                <span className="gradient-text">work in real time.</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Status changes, task progress, approvals, calendar updates — every event broadcasts to everyone who needs to see it. Instantly.
              </p>
              <ul className="space-y-3">
                {[
                  "Activity status updates as people change focus",
                  "Tasks complete and reassign without a refresh",
                  "Approvals appear the moment they're requested",
                  "Calendar windows recalculate on every event",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-indigo-100/40 via-violet-100/40 to-rose-100/40 blur-2xl" />
              <div className="relative rounded-3xl border border-border bg-white p-6 shadow-2xl shadow-indigo-100">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                  <div>
                    <div className="text-sm font-bold">Live activity feed</div>
                    <div className="text-xs text-muted-foreground">Pixelforge Studio</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Live
                  </div>
                </div>
                <LiveTicker />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* QUOTE                                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-32 px-6 bg-gradient-to-br from-indigo-50/40 via-white to-rose-50/40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-6xl text-indigo-600 mb-6 leading-none">&ldquo;</div>
          <p className="text-3xl md:text-4xl font-bold tracking-tighter leading-tight mb-8">
            Leaders see everything,<br />
            managers see what they need to lead,<br />
            and employees see what they need to execute.
          </p>
          <p className="text-base text-muted-foreground">
            <span className="font-semibold text-foreground">The Chrona principle</span>
            {" "}— and the foundation of how this product was built.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FINAL CTA                                                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-32 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="relative rounded-[2.5rem] overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600" />
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
              <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-white/10 blur-3xl animate-blob" />
              <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-white/10 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />
            </div>

            <div className="relative p-12 md:p-20 text-center">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tightest text-white mb-6 leading-[1.05]">
                Ready to run your<br />business smarter?
              </h2>
              <p className="text-lg md:text-xl text-white/80 max-w-xl mx-auto mb-10">
                Get started in minutes. No credit card. No hidden limits in v1.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 rounded-2xl bg-white text-indigo-700 px-8 py-4 text-base font-semibold shadow-2xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  Create your business
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white px-8 py-4 text-base font-semibold hover:bg-white/20"
                >
                  Sign in
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> 5 role tiers</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Real-time updates</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Bulletproof RLS</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> 10-min setup</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER                                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-border py-16 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight mb-4">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <span>Chrona <span className="gradient-text">Business</span></span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-md">
                An all-in-one workforce platform that gives every role in a company exactly the tools, visibility, and access they need.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/signup" className="hover:text-foreground">Sign up</Link></li>
                <li><Link href="/login"  className="hover:text-foreground">Log in</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Roadmap</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Documents (next sprint)</li>
                <li>AI assistant (v1.1)</li>
                <li>Calendar sync (v1.1)</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Chrona Business. Built for modern workforces.</p>
            <p className="font-mono text-xs">v1.0.0</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
