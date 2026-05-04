import { requireUser, requireActiveBusiness } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { progressForBusiness, progressForUser, efficientEmployees, overworkedEmployees } from "@/lib/dashboard/heuristics";
import { Card, CardTitle, ProgressBar, Ring } from "@/components/dashboard/Cards";
import { ROLE_LABEL } from "@/lib/auth/roles";

export default async function DashboardPage() {
  const user = await requireUser();
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();

  const role = active.role;

  const myProgress = await progressForUser(active.business.id, user.id);

  // Different scopes depending on role.
  const overall = await progressForBusiness(active.business.id);

  // Top efficient / overworked (employer/c_suite/manager/team_lead).
  const efficient = await efficientEmployees(active.business.id);
  const overworked = await overworkedEmployees(active.business.id);

  // Resolve user names for the lists.
  const userIds = [...new Set([...efficient.map(e => e.userId), ...overworked.map(o => o.userId)])];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", userIds)
    : { data: [] };
  const nameOf = (id: string) => {
    const p = profiles?.find((x) => x.id === id);
    return [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Unknown";
  };

  // Recommended tasks for viewer / team_lead.
  const { data: recommended } = await supabase
    .from("tasks")
    .select("id, title, priority, due_date")
    .eq("business_id", active.business.id)
    .eq("assigned_to", user.id)
    .neq("status", "completed")
    .order("priority", { ascending: false })
    .limit(5);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{ROLE_LABEL[role]} view · {active.business.name}</p>
        </div>
      </header>

      {(role === "employer" || role === "c_suite") && (
        <Card>
          <CardTitle>Company progress</CardTitle>
          <div className="mt-3"><ProgressBar percent={overall.percent} label={`${overall.completed} of ${overall.total} tasks complete`} /></div>
        </Card>
      )}

      {(role === "manager" || role === "team_lead") && (
        <Card>
          <CardTitle>Team progress</CardTitle>
          <div className="mt-3"><ProgressBar percent={overall.percent} label={`${overall.completed} of ${overall.total} tasks complete`} /></div>
        </Card>
      )}

      {role === "employee" && (
        <Card>
          <CardTitle>My progress this week</CardTitle>
          <div className="mt-3"><ProgressBar percent={myProgress.percent} label={`${myProgress.completed} of ${myProgress.total} tasks complete`} /></div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardTitle>Personal</CardTitle><div className="mt-3 flex justify-center"><Ring label="My tasks" percent={myProgress.percent} /></div></Card>
        <Card><CardTitle>{role === "employee" || role === "team_lead" ? "Own team" : "Teams"}</CardTitle><div className="mt-3 flex justify-center"><Ring label="Aggregate" percent={overall.percent} /></div></Card>
        <Card><CardTitle>{role === "employer" || role === "c_suite" ? "C-Suite & employees" : "Department"}</CardTitle><div className="mt-3 flex justify-center"><Ring label="Aggregate" percent={overall.percent} /></div></Card>
      </div>

      {role !== "employee" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardTitle>Most efficient (last 7 days)</CardTitle>
            <ul className="mt-3 space-y-1">
              {efficient.length === 0 && <li className="text-sm text-muted-foreground italic">No completed tasks yet.</li>}
              {efficient.map((e) => (
                <li key={e.userId} className="flex justify-between text-sm">
                  <span>{nameOf(e.userId)}</span>
                  <span className="text-muted-foreground">{e.completed} done</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardTitle>Most loaded (next 7 days)</CardTitle>
            <ul className="mt-3 space-y-1">
              {overworked.length === 0 && <li className="text-sm text-muted-foreground italic">No scheduled events yet.</li>}
              {overworked.map((o) => (
                <li key={o.userId} className="flex justify-between text-sm">
                  <span>{nameOf(o.userId)}</span>
                  <span className="text-muted-foreground">{o.hours}h scheduled</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {(role === "employee" || role === "team_lead") && (
        <Card>
          <CardTitle>Recommended for you</CardTitle>
          <ul className="mt-3 space-y-2">
            {!recommended || recommended.length === 0
              ? <li className="text-sm text-muted-foreground italic">No active tasks assigned.</li>
              : recommended.map((t) => (
                  <li key={t.id} className="flex justify-between text-sm">
                    <span>{t.title}</span>
                    <span className="text-xs text-muted-foreground capitalize">{t.priority}</span>
                  </li>
                ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
