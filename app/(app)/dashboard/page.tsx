import Link from "next/link";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { progressForBusiness, progressForUser, efficientEmployees, overworkedEmployees } from "@/lib/dashboard/heuristics";
import { Card, CardTitle } from "@/components/dashboard/Cards";
import { AnimatedRing, AnimatedProgressBar, AnimatedCount } from "@/components/dashboard/AnimatedCards";
import { RealtimeActivityTracker } from "@/components/dashboard/RealtimeActivityTracker";
import { DashboardRealtimeSync } from "@/components/dashboard/DashboardRealtimeSync";
import { ClientGreeting } from "@/components/dashboard/ClientGreeting";
import { ROLE_LABEL } from "@/lib/auth/roles";
import type { ActivityStatus } from "@/lib/supabase/types";
import { AlertTriangle, Trophy, ArrowRight, CheckCircle2, Users, Clock, Zap, Target, Star, ShieldAlert } from "lucide-react";

function priorityColour(due: string | null | undefined) {
  if (!due) return "#9ca3af";
  const d = new Date(due);
  const now = new Date();
  const days = (d.getTime() - now.getTime()) / 86400000;
  if (days < 0) return "#fb7185"; // expired - soft red
  if (days < 1) return "#fb7185"; // urgent
  if (days < 3) return "#fb923c"; // high
  if (days < 7) return "#fbbf24"; // normal
  return "#34d399"; // low / healthy
}

function getPriorityColorVal(priority: string | null | undefined) {
  const p = priority?.toLowerCase();
  if (p === "urgent") return "#ef4444"; // Red
  if (p === "high") return "#f97316";   // Orange
  if (p === "normal") return "#fbbf24"; // Yellow
  if (p === "low") return "#22c55e";    // Green
  return "#9ca3af";                      // Grey
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ new_member?: string }>;
}) {
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();
  const sp = searchParams ? await searchParams : {};
  const isNewMember = sp?.new_member === "1";

  const role = active.role;

  const [myProgress, overall, efficient, overworked] = await Promise.all([
    progressForUser(active.workspace.id, user.id),
    progressForBusiness(active.workspace.id),
    efficientEmployees(active.workspace.id),
    overworkedEmployees(active.workspace.id),
  ]);

  const userIds = [...new Set([...efficient.map(e => e.userId), ...overworked.map(o => o.userId)])];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", userIds)
    : { data: [] };

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  const firstName = myProfile?.first_name ?? "there";

  const nameOf = (id: string) => {
    const p = profiles?.find((x) => x.id === id);
    return [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Member";
  };

  const { data: priorityTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", active.workspace.id)
    .not("status", "in", "(completed,cancelled)")
    .not("due_date", "is", null)
    .order("due_date", { ascending: true })
    .limit(6);

  const { data: myTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", active.workspace.id)
    .eq("assigned_to", user.id)
    .not("status", "in", "(completed,cancelled)")
    .order("due_date", { ascending: true })
    .limit(5);

  // Quick stats
  const { count: pendingApprovals } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", active.workspace.id)
    .eq("status", "awaiting_approval");

  const { data: presence } = await supabase
    .from("activity_status")
    .select("workspace_member_id, status, workspace_members!inner(workspace_id, user_id, status, profiles!workspace_members_user_id_profiles_fkey(first_name, last_name, avatar_url))")
    .eq("workspace_members.workspace_id", active.workspace.id)
    .eq("workspace_members.status", "active")
    .limit(20);

  const onlineCount = (presence ?? []).filter((p) => {
    const s = (p as unknown as { status: string }).status;
    return s !== "offline";
  }).length;

  const initialPresence = (presence ?? []).map((p) => {
    const member = (p as unknown as { workspace_members?: { profiles?: { first_name?: string; last_name?: string; avatar_url?: string } } }).workspace_members;
    const profile = member?.profiles;
    return {
      workspace_member_id: p.workspace_member_id,
      user_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Teammate",
      avatar_url: profile?.avatar_url ?? null,
      status: p.status as ActivityStatus,
    };
  });

  const myTasksToday = (myTasks ?? []).length;

  return (
    <div className="dashboard-bg min-h-full">
      <div className="p-6 md:p-8 flex flex-col gap-6 max-w-6xl mx-auto">

        {/* ── New member welcome banner ── */}
        {isNewMember && (
          <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-6 py-5 flex items-center justify-between gap-4 shadow-lg animate-fade-up">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Welcome to the team! 🎉</p>
              <h2 className="text-lg font-bold">You&apos;ve successfully joined {active.workspace.name}</h2>
              <p className="text-sm opacity-80 mt-1">Your account is active. Explore your tasks, update your status, and connect with your team.</p>
            </div>
            <Link href="/tasks" className="shrink-0 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
              View tasks →
            </Link>
          </div>
        )}

        {/* ── Greeting hero banner (Premium Design) ── */}
        <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 via-card/80 to-purple-500/10 border border-border px-6 py-6 shadow-xl overflow-hidden animate-fade-up">
          {/* Animated meshes */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-[200px] h-[200px] bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">{todayLabel()}</p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mt-1">
                <ClientGreeting fallback={greeting()} />, <span className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 bg-clip-text text-transparent">{firstName}</span> 👋
              </h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 font-semibold text-[10px] text-primary uppercase tracking-wider">
                  {ROLE_LABEL[role]}
                </span>
                <span>·</span>
                <span className="font-medium">{active.workspace.name}</span>
              </div>
            </div>
            
            {/* Quick action chips with hover transitions */}
            <div className="flex flex-wrap gap-2.5">
              <Link href="/tasks?new=1" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/15 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:scale-95">
                <Zap className="h-3.5 w-3.5" />
                Create Task
              </Link>
              <Link href="/calendar" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-foreground bg-card hover:bg-accent border border-border hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:scale-95">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                Calendar
              </Link>
              <Link href="/organisation/members" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-foreground bg-card hover:bg-accent border border-border hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:scale-95">
                <Users className="h-3.5 w-3.5 text-violet-500" />
                Team Hub
              </Link>
            </div>
          </div>

          {/* Quick stats bar */}
          <div className="relative z-10 mt-5 flex flex-wrap gap-3 pt-4 border-t border-border/50">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 border border-border text-xs text-muted-foreground font-medium shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {myTasksToday} tasks assigned
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 border border-border text-xs text-muted-foreground font-medium shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="status-spark absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {onlineCount} online
            </span>
            {(pendingApprovals ?? 0) > 0 && (
              <Link href="/tasks" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 font-semibold hover:bg-amber-500/20 hover:-translate-y-0.5 transition-all cursor-pointer">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 animate-pulse-soft" />
                {pendingApprovals} pending approval{(pendingApprovals ?? 0) !== 1 ? "s" : ""}
              </Link>
            )}
          </div>
        </div>

        {/* ── Progress bar ── */}
        {(role === "owner" || role === "admin") && (
          <Link href="/tasks" className="block animate-fade-up delay-100">
            <div className="glass-card rounded-2xl p-5 border border-border hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between mb-3">
                <CardTitle>Company progress</CardTitle>
                <ArrowRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-1" />
              </div>
              <AnimatedProgressBar percent={overall.percent} label={`${overall.completed} of ${overall.total} tasks complete`} />
            </div>
          </Link>
        )}
        {role === "manager" && (
          <Link href="/tasks" className="block animate-fade-up delay-100">
            <div className="glass-card rounded-2xl p-5 border border-border hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between mb-3">
                <CardTitle>Team progress</CardTitle>
                <ArrowRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-1" />
              </div>
              <AnimatedProgressBar percent={overall.percent} label={`${overall.completed} of ${overall.total} tasks complete`} />
            </div>
          </Link>
        )}
        {role === "member" && (
          <Link href="/tasks" className="block animate-fade-up delay-100">
            <div className="glass-card rounded-2xl p-5 border border-border hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between mb-3">
                <CardTitle>My progress</CardTitle>
                <ArrowRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-1" />
              </div>
              <AnimatedProgressBar percent={myProgress.percent} label={`${myProgress.completed} of ${myProgress.total} tasks complete`} />
            </div>
          </Link>
        )}

        {/* ── Progress rings (Metric Hub Redesign) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { href: "/tasks", label: "My Work", subtitle: "Personal workload tracker", percent: myProgress.percent, icon: <Target className="h-4.5 w-4.5 text-indigo-650" />, delay: "delay-100" },
            { href: "/tasks", label: role === "member" || role === "manager" ? "Own team" : "Teams", subtitle: "Combined collaboration metrics", percent: overall.percent, icon: <Users className="h-4.5 w-4.5 text-violet-600" />, delay: "delay-200" },
            { href: "/organisation", label: role === "owner" || role === "admin" ? "C-Suite" : "Department", subtitle: "Full organization health status", percent: overall.percent, icon: <Star className="h-4.5 w-4.5 text-purple-600" />, delay: "delay-300" },
          ].map((ring) => (
            <Link key={ring.label} href={ring.href} className={`block animate-fade-up ${ring.delay}`}>
              <div className="glass-card rounded-2xl p-5 border border-border hover:border-indigo-200 flex items-center justify-between gap-4 h-full group">
                <div className="flex flex-col justify-between h-full space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      {ring.icon}
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{ring.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/80 line-clamp-1">{ring.subtitle}</p>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-foreground">
                      <AnimatedCount value={ring.percent} />%
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">completed scope</span>
                  </div>
                </div>
                <div className="shrink-0">
                  <AnimatedRing label="" percent={ring.percent} size={96} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Priority tasks (glowing borders & details) ── */}
        {(priorityTasks ?? []).length > 0 && (
          <div className="glass-card rounded-2xl p-6 border border-border animate-fade-up delay-200">
            <CardTitle className="mb-4">Priority tasks — nearest deadline first</CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {(priorityTasks ?? []).map((t) => {
                const glowClass = t.priority === "urgent" ? "priority-glow-urgent" : t.priority === "high" ? "priority-glow-high" : t.priority === "normal" ? "priority-glow-normal" : "priority-glow-low";
                const accentColor = getPriorityColorVal(t.priority);
                
                return (
                  <Link key={t.id} href={`/tasks/${t.id}`}>
                    <div 
                      className={`flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 hover:bg-slate-50/50 transition-all cursor-pointer ${glowClass} backdrop-blur-sm relative group shadow-sm`}
                      style={{ borderLeft: `4px solid ${accentColor}` }}
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t.priority}
                        </div>
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {t.title}
                        </h4>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1.5">
                          <span 
                            className="inline-block h-2 w-2 rounded-full shrink-0 status-spark"
                            style={{ background: accentColor, ["--spark-color" as string]: accentColor }} 
                          />
                          <span className="leading-none mt-[0.5px]">
                            {t.due_date
                              ? new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              : "No deadline"}
                          </span>
                        </span>
                        
                        <span className="text-[10px] bg-muted border border-border px-2 py-0.5 rounded-full capitalize text-muted-foreground">
                          {t.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Member: upcoming tasks ── */}
        {role === "member" && (myTasks ?? []).length > 0 && (
          <div className="glass-card rounded-2xl p-5 border border-border animate-fade-up delay-300">
            <CardTitle className="mb-3">My upcoming tasks</CardTitle>
            <ul className="space-y-2.5">
              {(myTasks ?? []).map((t) => (
                <Link key={t.id} href={`/tasks/${t.id}`} className="block">
                  <li className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 hover:bg-accent cursor-pointer transition-all shadow-sm">
                    <span className="text-sm font-medium text-foreground">{t.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full shrink-0 status-spark"
                        style={{ background: getPriorityColorVal(t.priority), ["--spark-color" as string]: getPriorityColorVal(t.priority) }} />
                      <span className="text-xs text-muted-foreground leading-none mt-[0.5px]">
                        {t.due_date ? new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                      </span>
                    </div>
                  </li>
                </Link>
              ))}
            </ul>
            <div className="mt-3 text-right">
              <Link href="/tasks" className="text-xs text-primary hover:opacity-80 font-semibold inline-flex items-center gap-1">
                See all work items <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}

        {/* ── Efficient + overworked ── */}
        {role !== "member" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-up delay-300">
            <Link href="/organisation/members" className="block">
              <div className="glass-card rounded-2xl p-5 border border-border hover:border-indigo-200 cursor-pointer h-full transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-4.5 w-4.5 text-amber-500" />
                    <CardTitle>Most efficient (last 7 days)</CardTitle>
                  </div>
                  <ul className="space-y-2">
                    {efficient.length === 0 ? (
                      <li className="text-xs text-muted-foreground/60 italic">No completed tasks yet.</li>
                    ) : (
                      efficient.map((e) => (
                        <li key={e.userId} className="flex justify-between items-center text-xs py-1 border-b border-border last:border-b-0">
                          <span className="font-semibold text-foreground">{nameOf(e.userId)}</span>
                          <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{e.completed} done</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="mt-4 text-[10px] text-muted-foreground flex justify-end">See full team details →</div>
              </div>
            </Link>

            <Link href="/organisation/members" className="block">
              <div className="glass-card rounded-2xl p-5 border border-border hover:border-indigo-200 cursor-pointer h-full transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="h-4.5 w-4.5 text-orange-500 animate-pulse-soft" />
                    <CardTitle>Most loaded (next 7 days)</CardTitle>
                  </div>
                  <ul className="space-y-2">
                    {overworked.length === 0 ? (
                      <li className="text-xs text-muted-foreground/60 italic">No one is overloaded.</li>
                    ) : (
                      overworked.map((o) => (
                        <li key={o.userId} className="flex justify-between items-center text-xs py-1 border-b border-border last:border-b-0">
                          <span className="font-semibold text-foreground">{nameOf(o.userId)}</span>
                          <span className={`font-black px-2 py-0.5 rounded-full border ${o.hours > 40 ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-orange-500 bg-orange-500/10 border-orange-500/20"}`}>
                            {o.hours}h
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                
                <div className="mt-4">
                  {overworked.some((o) => o.hours > 40) ? (
                    <div className="text-[10px] text-red-500 font-semibold bg-red-500/10 p-2 rounded border border-red-500/20">
                      ⚠️ Teammates above 40h work scope. Rebalancing advised.
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground flex justify-end">See full workload details →</div>
                  )}
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* ── Leaderboard ── */}
        <Link href="/rewards" className="block animate-fade-up delay-400">
          <div className="glass-card rounded-2xl p-5 border border-border hover:border-indigo-200 cursor-pointer transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-500">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Team Leaderboard</CardTitle>
                  <p className="text-xs text-muted-foreground">See who&apos;s earning the most points this cycle</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
            </div>
          </div>
        </Link>

        {/* ── Live activity ── */}
        <div className="glass-card rounded-2xl p-5 border border-border animate-fade-up delay-400">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <CardTitle>Live Activity Stream</CardTitle>
            <div className="flex items-center gap-2 text-xs text-emerald-500 font-extrabold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="status-spark absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>LIVE</span>
            </div>
          </div>
          <RealtimeActivityTracker businessId={active.workspace.id} initial={initialPresence} />
        </div>

        {/* Real-time sync for dashboard server metrics */}
        <DashboardRealtimeSync workspaceId={active.workspace.id} />

      </div>
    </div>
  );
}
