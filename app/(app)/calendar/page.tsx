import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveBusiness } from "@/lib/auth/session";
import { availableWindows } from "@/lib/calendar/windows";
import { Card, CardTitle } from "@/components/dashboard/Cards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const EVENT_COLOR: Record<string, string> = {
  meeting:    "#f97316",
  task_block: "#eab308",
  break:      "#3b82f6",
  lunch:      "#3b82f6",
  training:   "#6b7280",
  focus:      "#a855f7",
  other:      "#94a3b8",
};

async function createEvent(formData: FormData) {
  "use server";
  const user = await requireUser();
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();
  await supabase.from("calendar_events").insert({
    business_id: active.business.id,
    owner_id: user.id,
    title: String(formData.get("title") ?? "").trim(),
    event_type: (String(formData.get("event_type") ?? "meeting") as "meeting" | "task_block" | "break" | "lunch" | "training" | "focus" | "other"),
    start_at: String(formData.get("start_at")),
    end_at: String(formData.get("end_at")),
  });
  revalidatePath("/calendar");
}

export default async function CalendarPage() {
  const user = await requireUser();
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();

  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data: todayEvents } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("business_id", active.business.id)
    .eq("owner_id", user.id)
    .gte("start_at", dayStart)
    .lt("start_at", dayEnd)
    .order("start_at");

  const windows = await availableWindows(active.business.id, user.id, 7);

  const now = new Date();
  const totalMinutesToday = (todayEvents ?? []).reduce((acc, e) => {
    const s = new Date(e.start_at), end = new Date(e.end_at);
    return acc + Math.max(0, (end.getTime() - s.getTime()) / 60000);
  }, 0);
  const elapsedMinutesToday = (todayEvents ?? []).reduce((acc, e) => {
    const s = new Date(e.start_at), end = new Date(e.end_at);
    if (end <= now) return acc + (end.getTime() - s.getTime()) / 60000;
    if (s <= now) return acc + (now.getTime() - s.getTime()) / 60000;
    return acc;
  }, 0);
  const progressPct = totalMinutesToday === 0 ? 0 : Math.round((elapsedMinutesToday / totalMinutesToday) * 100);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted-foreground">Today · {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/calendar"><Button size="sm" variant="soft">Today</Button></Link>
          <Link href="/calendar/week"><Button size="sm" variant="outline">Week</Button></Link>
          <Link href="/calendar/month"><Button size="sm" variant="outline">Month</Button></Link>
        </div>
      </header>

      <Card>
        <CardTitle>Today&apos;s blocks</CardTitle>
        <div className="mt-4 space-y-2">
          {(todayEvents ?? []).length === 0 && <p className="text-sm text-muted-foreground italic">No events scheduled today.</p>}
          {(todayEvents ?? []).map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <span className="h-3 w-3 rounded-full" style={{ background: EVENT_COLOR[e.event_type] ?? "#94a3b8" }} />
              <div className="flex-1">
                <div className="text-sm font-medium">{e.title}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {e.event_type.replace("_", " ")} · {new Date(e.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  {" – "}
                  {new Date(e.end_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Current progression</CardTitle>
        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-muted">
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{progressPct}% of today&apos;s blocks complete</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Available windows</CardTitle>
          <ul className="mt-3 space-y-1 text-sm">
            {windows.length === 0 && <li className="text-muted-foreground italic">No open windows in next 7 days.</li>}
            {windows.slice(0, 8).map((w, i) => {
              const mins = (w.end.getTime() - w.start.getTime()) / 60000;
              const dur = mins >= 60 ? `${Math.round(mins / 60 * 10) / 10}h` : `${Math.round(mins)}m`;
              return (
                <li key={i}>
                  {w.start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  {" "}
                  {w.start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  {" — "}
                  <span className="text-muted-foreground">{dur}</span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardTitle>New event</CardTitle>
          <form action={createEvent} className="mt-3 grid grid-cols-1 gap-2">
            <div><Label className="text-xs">Title</Label><Input name="title" required /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Type</Label>
                <select name="event_type" className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm">
                  <option value="meeting">Meeting</option>
                  <option value="task_block">Task block</option>
                  <option value="break">Break</option>
                  <option value="lunch">Lunch</option>
                  <option value="training">Training</option>
                  <option value="focus">Focus</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Start</Label><Input name="start_at" type="datetime-local" required /></div>
              <div><Label className="text-xs">End</Label><Input name="end_at" type="datetime-local" required /></div>
            </div>
            <Button type="submit">Add to calendar</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
