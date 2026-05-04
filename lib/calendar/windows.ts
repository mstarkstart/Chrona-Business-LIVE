import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Window = { start: Date; end: Date };

// Compute free windows for a user during work-hours (default 9am–6pm) over a horizon in days.
export async function availableWindows(
  businessId: string,
  ownerId: string,
  horizonDays = 7,
  workHours: [number, number] = [9, 18]
): Promise<Window[]> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const end = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);

  const { data: events } = await supabase
    .from("calendar_events")
    .select("start_at, end_at")
    .eq("business_id", businessId)
    .eq("owner_id", ownerId)
    .gte("end_at", now.toISOString())
    .lte("start_at", end.toISOString())
    .order("start_at");

  const out: Window[] = [];
  const busy = (events ?? []).map((e) => ({
    start: new Date(e.start_at),
    end:   new Date(e.end_at),
  }));

  for (let i = 0; i < horizonDays; i++) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() + i);
    dayStart.setHours(workHours[0], 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(workHours[1], 0, 0, 0);

    let cursor = i === 0 ? new Date(Math.max(dayStart.getTime(), now.getTime())) : new Date(dayStart);
    const dayEvents = busy.filter((b) => b.end > dayStart && b.start < dayEnd).sort((a, b) => a.start.getTime() - b.start.getTime());

    for (const e of dayEvents) {
      if (e.start > cursor) {
        out.push({ start: new Date(cursor), end: new Date(Math.min(e.start.getTime(), dayEnd.getTime())) });
      }
      if (e.end > cursor) cursor = new Date(e.end);
    }
    if (cursor < dayEnd) out.push({ start: new Date(cursor), end: new Date(dayEnd) });
  }

  // Filter trivially small windows.
  return out.filter((w) => (w.end.getTime() - w.start.getTime()) / 60000 >= 30);
}
