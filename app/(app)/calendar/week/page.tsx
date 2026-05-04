import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveBusiness } from "@/lib/auth/session";
import { Card } from "@/components/dashboard/Cards";
import { Button } from "@/components/ui/button";

const EVENT_COLOR: Record<string, string> = {
  meeting: "#f97316", task_block: "#eab308", break: "#3b82f6",
  lunch: "#3b82f6", training: "#6b7280", focus: "#a855f7", other: "#94a3b8",
};

const HOURS_START = 8;
const HOURS_END = 22;

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export default async function WeekView() {
  const user = await requireUser();
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();

  const start = startOfWeek(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const { data: events } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("business_id", active.business.id)
    .eq("owner_id", user.id)
    .gte("start_at", start.toISOString())
    .lt("start_at", end.toISOString())
    .order("start_at");

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i); return d;
  });
  const totalHours = HOURS_END - HOURS_START;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Calendar — Week</h1>
        <div className="flex gap-2">
          <Link href="/calendar"><Button size="sm" variant="outline">Today</Button></Link>
          <Link href="/calendar/week"><Button size="sm" variant="soft">Week</Button></Link>
          <Link href="/calendar/month"><Button size="sm" variant="outline">Month</Button></Link>
        </div>
      </header>

      <Card>
        <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-px text-xs">
          <div></div>
          {days.map((d) => (
            <div key={d.toISOString()} className="text-center font-medium pb-1">
              {d.toLocaleDateString("en-US", { weekday: "short" })}<br />
              <span className="text-muted-foreground">{d.getDate()}</span>
            </div>
          ))}

          <div className="flex flex-col text-right text-[10px] text-muted-foreground">
            {Array.from({ length: totalHours + 1 }, (_, i) => (
              <div key={i} style={{ height: 28 }}>{HOURS_START + i}:00</div>
            ))}
          </div>

          {days.map((day, di) => {
            const dayStart = new Date(day); dayStart.setHours(HOURS_START, 0, 0, 0);
            const dayEnd = new Date(day); dayEnd.setHours(HOURS_END, 0, 0, 0);
            const dayEvents = (events ?? []).filter((e) => {
              const s = new Date(e.start_at);
              return s.getDate() === day.getDate() && s.getMonth() === day.getMonth();
            });
            return (
              <div key={di} className="relative border-l border-border" style={{ height: (totalHours + 1) * 28 }}>
                {Array.from({ length: totalHours + 1 }, (_, i) => (
                  <div key={i} className="border-t border-border/50" style={{ height: 28 }} />
                ))}
                {dayEvents.map((e) => {
                  const s = new Date(e.start_at);
                  const en = new Date(e.end_at);
                  const top = ((s.getTime() - dayStart.getTime()) / 60000 / 60) * 28;
                  const h = Math.max(((en.getTime() - s.getTime()) / 60000 / 60) * 28, 14);
                  return (
                    <div
                      key={e.id}
                      className="absolute left-1 right-1 rounded-md px-1.5 py-0.5 text-[10px] text-white truncate shadow-sm"
                      style={{ top, height: h, background: EVENT_COLOR[e.event_type] ?? "#94a3b8" }}
                      title={`${e.title} (${e.event_type})`}
                    >
                      {e.title}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
