import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveBusiness } from "@/lib/auth/session";
import { Card } from "@/components/dashboard/Cards";
import { Button } from "@/components/ui/button";

const EVENT_COLOR: Record<string, string> = {
  meeting: "#f97316", task_block: "#eab308", break: "#3b82f6",
  lunch: "#3b82f6", training: "#6b7280", focus: "#a855f7", other: "#94a3b8",
};

export default async function MonthView() {
  const user = await requireUser();
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Pad to start on Sunday.
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const { data: events } = await supabase
    .from("calendar_events")
    .select("start_at, event_type")
    .eq("business_id", active.business.id)
    .eq("owner_id", user.id)
    .gte("start_at", gridStart.toISOString())
    .lte("start_at", gridEnd.toISOString());

  const days: Date[] = [];
  const cur = new Date(gridStart);
  while (cur <= gridEnd) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          {today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h1>
        <div className="flex gap-2">
          <Link href="/calendar"><Button size="sm" variant="outline">Today</Button></Link>
          <Link href="/calendar/week"><Button size="sm" variant="outline">Week</Button></Link>
          <Link href="/calendar/month"><Button size="sm" variant="soft">Month</Button></Link>
        </div>
      </header>

      <Card>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
            <div key={d} className="text-center font-medium text-muted-foreground pb-1">{d}</div>
          ))}
          {days.map((d) => {
            const inMonth = d.getMonth() === today.getMonth();
            const dayEvents = (events ?? []).filter((e) => {
              const s = new Date(e.start_at);
              return s.toDateString() === d.toDateString();
            });
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div
                key={d.toISOString()}
                className={`min-h-[80px] rounded-md border p-1 ${
                  inMonth ? "bg-card border-border" : "bg-muted/30 border-transparent"
                } ${isToday ? "ring-2 ring-indigo-500" : ""}`}
              >
                <div className="text-[11px] text-muted-foreground">{d.getDate()}</div>
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {dayEvents.slice(0, 8).map((e, i) => (
                    <span key={i} className="h-1.5 w-3 rounded-sm" style={{ background: EVENT_COLOR[e.event_type] ?? "#94a3b8" }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
