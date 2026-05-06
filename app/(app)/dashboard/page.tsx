import Link from "next/link";
import { requireUser, requireActiveBusiness } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { progressForBusiness, progressForUser, efficientEmployees, overworkedEmployees } from "@/lib/dashboard/heuristics";
import { Card, CardTitle, ProgressBar, Ring } from "@/components/dashboard/Cards";
import { RealtimeActivityTracker } from "@/components/dashboard/RealtimeActivityTracker";
import { ROLE_LABEL } from "@/lib/auth/roles";
import type { ActivityStatus } from "@/lib/supabase/types";
import { AlertTriangle, Trophy, ArrowRight } from "lucide-react";

function priorityColour(due: string | null | undefined) {
  if (!due) return "#6b7280";
  const d = new Date(due);
  const now = new Date();
  const days = (d.getTime() - now.getTime()) / 86400000;
  if (days < 0) return "#ef4444"; // overdue
  if (days < 1) return "#ef4444"; // due today
  if (days < 3) return "#f97316"; // due soon
  if (days < 7) return "#eab308"; // this week
  return "#22c55e";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();

  const role = active.role;

  const [myProgress, overall, efficient, overworked] = await Promise.all([
    progressForUser(active.business.id, user.id),
    progressForBusiness(active.business.id),
    efficientEmployees(active.business.id),
    overworkedEmployees(active.business.id),
  ]);

  // Resolve user names
  const userIds = [...new Set([...efficient.map(e => e.userId), ...overworked.map(o => o.userId)])];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", userIds)
    : { data: [] };
  const nameOf = (id: string) => {
    const p = profiles?.find((x) => x.id === id);
    return [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Member";
  };

  // Priority tasks — sorted by nearest deadline, any priority
  const { data: priorityTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("business_id", active.business.id)
    .not("status", "in", "(completed,cancelled)")
    .not("due_date", "is", null)
    .order("due_date", { ascending: true })
    .limit(6);

  // My upcoming tasks (employee view)
  const { data: myTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("business_id", active.business.id)
    .eq("assigned_to", user.id)
    .not("status", "in", "(completed,cancelled)")
    .order("due_date", { ascending: true })
    .limit(5);

  // Realtime activity tracker
  const { data: presence } = await supabase
    .from("activity_status")
    .select("business_member_id, status, business_members!inner(business_id, user_id, profiles!business_members_user_id_profiles_fkey(first_name, last_name))")
    .eq("business_members.business_id", active.business.id)
    .limit(20);

  const initialPresence = (presence ?? []).map((p) => {
    const member = (p as unknown as { business_members?: { profiles?: { first_name?: string; last_name?: string } } }).business_members;
    const profile = member?.profiles;
    return {
      business_member_id: p.business_member_id,
      user_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Member",
      status: p.status as ActivityStatus,
    };
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{ROLE_LABEL[role]} view · {active.business.name}</p>
        </div>
      </header>

      {/* Progress bar */}
      {(role === "employer" || role === "c_suite") && (
        <Link href="/tasks">
          <Card className="cursor-pointer hover:border-indigo-300 transition-colors">
            <CardTitle>Company progress</CardTitle>
            <div className="mt-3"><ProgressBar percent={overall.percent} label={`${overall.completed} of ${overall.total} tasks complete`} /></div>
            <div className="flex justify-end mt-2"><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
          </Card>
        </Link>
      )}
      {(role === "manager" || role === "team_lead") && (
        <Link href="/tasks">
          <Card className="cursor-pointer hover:border-indigo-300 transition-colors">
            <CardTitle>Team progress</CardTitle>
            <div className="mt-3"><ProgressBar percent={overall.percent} label={`${overall.completed} of ${overall.total} tasks complete`} /></div>
            <div className="flex justify-end mt-2"><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
          </Card>
        </Link>
      )}
      {role === "employee" && (
        <Link href="/tasks">
          <Card className="cursor-pointer hover:border-indigo-300 transition-colors">
            <CardTitle>My progress</CardTitle>
            <div className="mt-3"><ProgressBar percent={myProgress.percent} label={`${myProgress.completed} of ${myProgress.total} tasks complete`} /></div>
            <div className="flex justify-end mt-2"><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
          </Card>
        </Link>
      )}

      {/* Progress rings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/tasks"><Card className="cursor-pointer hover:border-indigo-300"><CardTitle>Personal</CardTitle><div className="mt-3 flex justify-center"><Ring label="My tasks" percent={myProgress.percent} /></div></Card></Link>
        <Link href="/tasks"><Card className="cursor-pointer hover:border-indigo-300"><CardTitle>{role === "employee" || role === "team_lead" ? "Own team" : "Teams"}</CardTitle><div className="mt-3 flex justify-center"><Ring label="Aggregate" percent={overall.percent} color="#6366f1" /></div></Card></Link>
        <Link href="/organisation"><Card className="cursor-pointer hover:border-indigo-300"><CardTitle>{role === "employer" || role === "c_suite" ? "C-Suite & employees" : "Department"}</CardTitle><div className="mt-3 flex justify-center"><Ring label="Aggregate" percent={overall.percent} color="#8b5cf6" /></div></Card></Link>
      </div>

      {/* Priority tasks sorted by nearest deadline */}
      {(priorityTasks ?? []).length > 0 && (
        <Card>
          <CardTitle>Priority tasks — nearest deadline first</CardTitle>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(priorityTasks ?? []).map((t) => (
              <Link key={t.id} href={`/tasks/${t.id}`}>
                <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3 hover:bg-accent transition-colors cursor-pointer">
                  <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: priorityColour(t.due_date) }} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t.due_date
                        ? `Due ${new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : "No deadline"}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Employee: upcoming tasks */}
      {role === "employee" && (myTasks ?? []).length > 0 && (
        <Card>
          <CardTitle>My upcoming tasks</CardTitle>
          <ul className="mt-3 space-y-2">
            {(myTasks ?? []).map((t) => (
              <Link key={t.id} href={`/tasks/${t.id}`}>
                <li className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-accent cursor-pointer">
                  <span className="text-sm font-medium">{t.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: priorityColour(t.due_date) }} />
                    <span className="text-xs text-muted-foreground">
                      {t.due_date ? new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </span>
                  </div>
                </li>
              </Link>
            ))}
          </ul>
          <div className="mt-3 text-right"><Link href="/tasks" className="text-xs text-indigo-600 hover:underline">See all →</Link></div>
        </Card>
      )}

      {/* Efficient + overworked cards */}
      {role !== "employee" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/organisation/members">
            <Card className="cursor-pointer hover:border-indigo-300">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4 text-amber-500" />
                <CardTitle>Most efficient (last 7 days)</CardTitle>
              </div>
              <ul className="space-y-1.5">
                {efficient.length === 0
                  ? <li className="text-sm text-muted-foreground italic">No completed tasks yet.</li>
                  : efficient.map((e) => (
                      <li key={e.userId} className="flex justify-between text-sm">
                        <span>{nameOf(e.userId)}</span>
                        <span className="text-muted-foreground">{e.completed} done</span>
                      </li>
                    ))}
              </ul>
            </Card>
          </Link>

          <Link href="/organisation/members">
            <Card className="cursor-pointer hover:border-indigo-300">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <CardTitle>Most loaded (next 7 days)</CardTitle>
              </div>
              <ul className="space-y-1.5">
                {overworked.length === 0
                  ? <li className="text-sm text-muted-foreground italic">No one is overloaded.</li>
                  : overworked.map((o) => (
                      <li key={o.userId} className="flex justify-between text-sm">
                        <span>{nameOf(o.userId)}</span>
                        <span className={`font-semibold ${o.hours > 40 ? "text-red-600" : "text-orange-600"}`}>{o.hours}h</span>
                      </li>
                    ))}
              </ul>
              {overworked.some((o) => o.hours > 40) && (
                <div className="mt-2 text-xs text-red-600 font-medium">⚠️ Above 40h — consider rebalancing</div>
              )}
            </Card>
          </Link>
        </div>
      )}

      {/* Realtime live activity tracker */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardTitle>Live activity</CardTitle>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </div>
        </div>
        <RealtimeActivityTracker businessId={active.business.id} initial={initialPresence} />
      </Card>
    </div>
  );
}
