import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import { CalendarRealtimeSync } from "@/components/calendar/CalendarRealtimeSync";
import { FullCalendarClient } from "@/components/calendar/FullCalendarClient";
import { QuickScheduleForm } from "@/components/calendar/QuickScheduleForm";
import { Users, CalendarDays } from "lucide-react";
import { UpcomingReminders } from "@/components/calendar/UpcomingReminders";

async function createEvent(formData: FormData) {
  "use server";
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  const date     = String(formData.get("date") ?? "");
  let startT   = String(formData.get("start_time") ?? "");
  let endT     = String(formData.get("end_time") ?? "");
  const is_team  = formData.get("is_team") === "on";
  const title    = String(formData.get("title") ?? "").trim();
  const typeStr  = String(formData.get("event_type") ?? "meeting");

  if (!startT) startT = "09:00";
  if (!endT) endT = "10:00";
  
  if (startT >= endT) {
    // Automatically add 1 hour if end time is invalid
    const [h, m] = startT.split(":").map(Number);
    endT = `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const description = String(formData.get("description") ?? "").trim() || null;

  const { error } = await supabase.from("calendar_events").insert({
    workspace_id: active.workspace.id,
    owner_id:     user.id,
    title,
    event_type:   typeStr as any,
    start_at:     `${date}T${startT}:00`,
    end_at:       `${date}T${endT}:00`,
    is_team,
    description,
  } as any);

  if (error) {
    console.error("Failed to insert calendar event:", error);
    throw new Error(error.message);
  }

  // Broadcast realtime event
  supabaseAdmin.channel(`calendar:${active.workspace.id}`).send({
    type: "broadcast",
    event: "calendar_updated",
    payload: { action: "insert" }
  });

  if (is_team) {
    const { data: members } = await supabaseAdmin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", active.workspace.id)
      .eq("status", "active")
      .neq("user_id", user.id);

    if (members && members.length > 0) {
      const inserts = members.map(m => ({
        workspace_id: active.workspace.id,
        user_id: m.user_id,
        type: "task_assignment",
        title: `Team Calendar Event: ${title}`,
        body: `A new team event was scheduled for ${date} at ${startT}.`
      }));
      await supabaseAdmin.from("notifications").insert(inserts as any);
    }
  }

  revalidatePath("/calendar");
}

async function deleteEvent(id: string) {
  "use server";
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const active = await requireActiveWorkspace();

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (!error) {
    supabaseAdmin.channel(`calendar:${active.workspace.id}`).send({
      type: "broadcast",
      event: "calendar_updated",
      payload: { action: "delete" }
    });
    revalidatePath("/calendar");
  }
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ team?: string }>;
}) {
  const sp       = searchParams ? await searchParams : {};
  const teamMode = sp?.team === "1";

  const user   = await requireUser();
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  const today = new Date();
  
  // Fetch events for the current month +/- 1 month to ensure enough data for the view
  const fetchStart = new Date(today);
  fetchStart.setMonth(fetchStart.getMonth() - 1);
  const fetchEnd = new Date(today);
  fetchEnd.setMonth(fetchEnd.getMonth() + 2);

  // Personal or team query
  const eventsQuery = supabase
    .from("calendar_events")
    .select("*, profiles!owner_id(first_name, last_name)")
    .eq("workspace_id", active.workspace.id)
    .gte("start_at", fetchStart.toISOString())
    .lte("start_at", fetchEnd.toISOString());

  if (!teamMode) eventsQuery.eq("owner_id", user.id);
  else           eventsQuery.eq("is_team", true);

  const { data: rawEvents } = await eventsQuery;
  const allEvents = (rawEvents ?? []) as any[];

  // Fetch incomplete tasks with due dates for calendar overlay
  const { data: tasksDue } = await supabase
    .from("tasks")
    .select("id, title, due_date, status, priority")
    .eq("workspace_id", active.workspace.id)
    .not("due_date", "is", null)
    .not("status", "in", '("completed","cancelled")')
    .gte("due_date", fetchStart.toISOString().slice(0, 10))
    .lte("due_date", fetchEnd.toISOString().slice(0, 10));

  const todayDate = today.toLocaleDateString("en-US", { weekday: "long", month: "long", year: "numeric" });
  const todayStr = today.toISOString().slice(0, 10);

  // Compute per-member event counts for today (team mode only, no extra query)
  const memberMap = teamMode
    ? (allEvents ?? []).reduce((acc, e) => {
        if (!e.start_at.startsWith(todayStr)) return acc;
        const key = e.owner_id ?? "?";
        const p = e.profiles;
        const name = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "Teammate";
        acc[key] = { name: name || "Teammate", count: (acc[key]?.count ?? 0) + 1 };
        return acc;
      }, {} as Record<string, { name: string; count: number }>)
    : null;

  return (
    <div className="bg-mesh p-4 md:p-6 min-h-[calc(100vh-57px)] flex flex-col overflow-y-auto space-y-4 animate-fade-up">
      <CalendarRealtimeSync workspaceId={active.workspace.id} ownerId={user.id} />

      {/* ── Header ── */}
      <header className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <CalendarDays className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-tight">Calendar</h1>
            <p className="text-xs text-muted-foreground font-medium">{todayDate}</p>
          </div>
        </div>

        {/* Scope toggle: My Calendar / Team Calendar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border gap-0.5">
            <Link
              href="/calendar"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !teamMode
                  ? "bg-white text-indigo-600 shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              My Calendar
            </Link>
            <Link
              href="/calendar?team=1"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                teamMode
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Team Calendar
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Layout: Calendar + Sidebar ── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* FullCalendar wrapper */}
        <div className="flex-1 min-w-0 animate-fade-up delay-100">
          <FullCalendarClient
            events={allEvents ?? []}
            taskEvents={tasksDue ?? []}
            teamMode={teamMode}
            currentUserId={user.id}
            createEvent={createEvent}
            deleteEvent={deleteEvent}
          />
        </div>

        {/* Sidebar — Quick Schedule + Team Today only */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4 animate-fade-up delay-200">
          {/* Quick Schedule card */}
          <div className="glass-card rounded-3xl p-6 shadow-xl shadow-indigo-900/5 bg-white/60 backdrop-blur-xl border border-white/60 relative">
            <div className="absolute top-0 right-0 p-32 bg-indigo-400/10 rounded-full blur-3xl -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3" />
            <h2 className="text-sm font-extrabold tracking-wide text-foreground mb-6 flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-500/30">
                <span className="text-white text-xs font-black">+</span>
              </div>
              Quick Schedule
            </h2>
            <QuickScheduleForm createEvent={createEvent} defaultDate={todayStr} />
          </div>

          {/* Team Today panel — only in team mode */}
          {teamMode && memberMap && Object.keys(memberMap).length > 0 && (
            <div className="glass-card rounded-3xl p-5 shadow-lg shadow-indigo-900/5 bg-white/60 backdrop-blur-xl border border-white/60 animate-fade-up delay-300">
              <h2 className="text-sm font-extrabold tracking-wide text-foreground mb-4 flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-indigo-100 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                Team Today
              </h2>
              <ul className="space-y-2">
                {Object.entries(memberMap).map(([uid, val]) => {
                  const { name, count } = val as { name: string; count: number };
                  return (
                    <li key={uid} className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/60 border border-white/80 hover:bg-indigo-50/60 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                          {name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-foreground">{name}</span>
                      </div>
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-200/60">
                        {count} event{count !== 1 ? "s" : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

      </div>

      {/* ── Upcoming (24h) — full width below calendar + sidebar ── */}
      <div className="animate-fade-up delay-300 pb-6">
        <UpcomingReminders events={allEvents ?? []} />
      </div>

    </div>
  );
}
