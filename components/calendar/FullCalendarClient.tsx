"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { Tables } from "@/lib/supabase/types";
import { EVENT_COLOR, EVENT_ICON, EVENT_LABEL } from "./constants";
import { X, Trash2, Globe, Calendar, Clock, CalendarPlus, Edit2, Check, CheckSquare } from "lucide-react";
import { createPortal } from "react-dom";

type CalEvent = Tables<"calendar_events"> & {
  profiles?: { first_name?: string; last_name?: string } | null;
  description?: string | null;
};

type TaskEvent = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  priority: string;
};

interface FullCalendarClientProps {
  events: CalEvent[];
  taskEvents?: TaskEvent[];
  teamMode: boolean;
  currentUserId: string;
  createEvent: (fd: FormData) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

const PALETTE = ["#4f46e5", "#f97316", "#10b981", "#f43f5e", "#0ea5e9", "#eab308", "#a855f7", "#06b6d4"];
function ownerColor(id: string) { return PALETTE[parseInt(id.slice(0, 2), 16) % PALETTE.length]; }

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high:   "#f97316",
  normal: "#6366f1",
  low:    "#94a3b8",
};

export function FullCalendarClient({
  events, taskEvents = [], teamMode, currentUserId, createEvent, deleteEvent
}: FullCalendarClientProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{
    start: string; end: string; date: string; startTime: string; endTime: string;
  } | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalEvent | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => { setMounted(true); }, []);

  const handleSelect = (selectInfo: any) => {
    const start = new Date(selectInfo.start);
    const end = new Date(selectInfo.end);
    const dateStr = selectInfo.startStr.slice(0, 10);
    let startTime = "09:00", endTime = "10:00";
    if (!selectInfo.allDay) {
      startTime = `${String(start.getHours()).padStart(2,"0")}:${String(start.getMinutes()).padStart(2,"0")}`;
      endTime = `${String(end.getHours()).padStart(2,"0")}:${String(end.getMinutes()).padStart(2,"0")}`;
    }
    setSelectedRange({ start: selectInfo.startStr, end: selectInfo.endStr, date: dateStr, startTime, endTime });
  };

  const handleEventClick = (clickInfo: any) => {
    const eventId = clickInfo.event.id;
    if (eventId.startsWith("task-")) return; // task pills are not editable here
    const original = events.find(e => e.id === eventId);
    if (original) {
      setActiveEvent(original);
      setEditMode(false);
      setEditTitle(original.title);
      setEditType(original.event_type);
      setEditDesc((original as any).description ?? "");
      const s = new Date(original.start_at);
      const e2 = new Date(original.end_at);
      setEditStart(`${String(s.getHours()).padStart(2,"0")}:${String(s.getMinutes()).padStart(2,"0")}`);
      setEditEnd(`${String(e2.getHours()).padStart(2,"0")}:${String(e2.getMinutes()).padStart(2,"0")}`);
    }
  };

  const handleEventDrop = async (dropInfo: any) => {
    const id = dropInfo.event.id;
    if (id.startsWith("task-")) { dropInfo.revert(); return; }
    const newStart = dropInfo.event.startStr;
    const newEnd = dropInfo.event.endStr || dropInfo.event.startStr;
    try {
      const res = await fetch("/api/calendar/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, start_at: newStart, end_at: newEnd }),
      });
      if (!res.ok) dropInfo.revert();
    } catch {
      dropInfo.revert();
    }
  };

  const handleEventResize = async (resizeInfo: any) => {
    const id = resizeInfo.event.id;
    if (id.startsWith("task-")) { resizeInfo.revert(); return; }
    const newStart = resizeInfo.event.startStr;
    const newEnd = resizeInfo.event.endStr;
    try {
      const res = await fetch("/api/calendar/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, start_at: newStart, end_at: newEnd }),
      });
      if (!res.ok) resizeInfo.revert();
    } catch {
      resizeInfo.revert();
    }
  };

  const handleSaveEdit = async () => {
    if (!activeEvent) return;
    setSaving(true);
    const datePart = activeEvent.start_at.slice(0, 10);
    const newStartAt = `${datePart}T${editStart}:00`;
    const newEndAt = `${datePart}T${editEnd}:00`;
    try {
      await fetch("/api/calendar/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeEvent.id,
          start_at: newStartAt,
          end_at: newEndAt,
          title: editTitle,
          event_type: editType,
          description: editDesc || null,
        }),
      });
      setActiveEvent(null);
      setEditMode(false);
    } catch {}
    setSaving(false);
  };

  const handleModalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await createEvent(fd);
      setSelectedRange(null);
      calendarRef.current?.getApi().unselect();
    });
  };

  const handleEventDelete = () => {
    if (!activeEvent) return;
    startTransition(async () => {
      await deleteEvent(activeEvent.id);
      setActiveEvent(null);
    });
  };

  // Map calendar events
  const mappedEvents = events.map(e => {
    const isOwner = e.owner_id === currentUserId;
    const safeType = EVENT_COLOR[e.event_type] ? e.event_type : "other";
    const color = teamMode && !isOwner ? ownerColor(e.owner_id ?? "") : EVENT_COLOR[safeType];
    const profile = e.profiles;
    const ownerName = profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : "";
    return {
      id: e.id,
      title: `${e.title}${teamMode && !isOwner && ownerName ? ` · ${ownerName}` : ""}`,
      start: e.start_at,
      end: e.end_at,
      backgroundColor: `${color}ee`,
      borderColor: `${color}44`,
      textColor: "#ffffff",
      display: "block" as const,
      extendedProps: { isTeam: e.is_team, ownerId: e.owner_id, eventType: safeType, isTask: false },
    };
  });

  // Map task due-date events as all-day pills (skip tasks without a due date)
  const mappedTaskEvents = taskEvents
    .filter(t => t.due_date != null)
    .map(t => ({
      id: `task-${t.id}`,
      title: t.title,
      start: t.due_date as string,
      allDay: true,
      backgroundColor: `${PRIORITY_COLORS[t.priority] ?? "#6366f1"}22`,
      borderColor: `${PRIORITY_COLORS[t.priority] ?? "#6366f1"}88`,
      textColor: PRIORITY_COLORS[t.priority] ?? "#6366f1",
      display: "block" as const,
      extendedProps: { isTask: true, priority: t.priority },
    }));

  const allMappedEvents = [...mappedEvents, ...mappedTaskEvents];

  return (
    <div className={`glass-card rounded-2xl overflow-hidden shadow-sm p-4 bg-white/80 transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        .fc { font-family: inherit; }
        .fc-theme-standard td, .fc-theme-standard th, .fc-theme-standard .fc-scrollgrid { border-color: hsl(var(--border) / 0.2); }
        .fc-col-header-cell { background-color: rgba(248, 250, 252, 0.4); backdrop-filter: blur(8px); }
        .fc-col-header-cell-cushion { padding: 12px 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800; color: hsl(var(--foreground) / 0.7); }
        .fc-timegrid-slot { height: 56px; border-bottom: 1px solid hsl(var(--border) / 0.1); }
        .fc-timegrid-slot-minor { border-bottom: 1px dashed hsl(var(--border) / 0.05); }
        .fc-v-event { border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: none !important; border-left: 4px solid rgba(255,255,255,0.5) !important; backdrop-filter: blur(8px); cursor: grab; }
        .fc-v-event:hover { z-index: 50 !important; filter: brightness(1.1); transform: translateY(-2px) scale(1.02); box-shadow: 0 10px 20px rgba(0,0,0,0.15); }
        .fc-v-event:active { cursor: grabbing; }
        .fc-event-main { padding: 4px 6px; }
        .fc-event-title { font-size: 11px; font-weight: 700; line-height: 1.3; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .fc-event-time { font-size: 10px; font-weight: 500; opacity: 0.9; margin-top: 2px; }
        .fc-toolbar-title { font-size: 1.5rem !important; font-weight: 800 !important; letter-spacing: -0.02em; color: hsl(var(--foreground)); }
        .fc-button-primary { background-color: white !important; color: #4f46e5 !important; border: 1px solid hsl(var(--border) / 0.4) !important; font-weight: 600 !important; text-transform: capitalize !important; border-radius: 10px !important; box-shadow: 0 2px 4px rgba(0,0,0,0.02) !important; transition: all 0.2s !important; }
        .fc-button-primary:hover { background-color: #f8fafc !important; color: #4f46e5 !important; border-color: #4f46e5 !important; transform: translateY(-1px); }
        .fc-button-active { background-color: #4f46e5 !important; color: white !important; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3) !important; border-color: #4f46e5 !important; }
        .fc-button-active:hover { background-color: #4338ca !important; color: white !important; border-color: #4338ca !important; }
        .fc-button:focus { box-shadow: none !important; outline: none !important; }
        .fc-timegrid-now-indicator-line { border-color: #ec4899; border-width: 2px; box-shadow: 0 0 8px rgba(236, 72, 153, 0.5); }
        .fc-timegrid-now-indicator-arrow { border-color: #ec4899; border-width: 6px; }
        .fc .fc-scroller::-webkit-scrollbar { width: 6px; height: 6px; }
        .fc .fc-scroller::-webkit-scrollbar-track { background: transparent; }
        .fc .fc-scroller::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 4px; }
        .fc-daygrid-day { transition: background 0.2s; }
        .fc-daygrid-day:hover { background-color: rgba(79, 70, 229, 0.025) !important; }
        .fc-daygrid-day-number { font-size: 12px; font-weight: 700; color: hsl(var(--foreground) / 0.7); padding: 8px 10px !important; text-decoration: none !important; }
        .fc-day-today .fc-daygrid-day-number { background: #4f46e5; color: white !important; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; padding: 0 !important; margin: 6px; }
        .fc-day-today { background-color: rgba(79, 70, 229, 0.02) !important; }
        .fc-daygrid-event, .fc-h-event, .fc-daygrid-block-event { border-radius: 6px !important; font-size: 11px; font-weight: 600; padding: 3px 6px !important; margin: 2px 4px !important; border: none !important; border-left: 3px solid rgba(255,255,255,0.4) !important; box-shadow: 0 2px 4px rgba(0,0,0,0.04) !important; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important; backdrop-filter: blur(8px); }
        .fc-daygrid-event:hover, .fc-h-event:hover, .fc-daygrid-block-event:hover { filter: brightness(1.1) !important; transform: translateY(-1px) scale(1.01) !important; box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important; z-index: 20 !important; }
        .fc-more-link { font-size: 10px; font-weight: 700; color: #4f46e5; padding: 1px 4px; border-radius: 4px; background: rgba(79,70,229,0.07); }
        .fc-more-link:hover { background: rgba(79,70,229,0.14); }
        .task-pill .fc-event-main { display: flex; align-items: center; gap: 4px; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
        slotMinTime="06:00:00"
        slotMaxTime="23:00:00"
        height="650px"
        events={allMappedEvents}
        nowIndicator={true}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        eventResizableFromStart={false}
        select={handleSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        eventContent={(arg) => {
          const isTask = arg.event.extendedProps.isTask;
          const Icon = isTask ? CheckSquare : (EVENT_ICON[arg.event.extendedProps.eventType as string] ?? null);
          const isMonthView = arg.view.type.startsWith("dayGrid");

          if (isTask) {
            const priority = arg.event.extendedProps.priority as string;
            const color = PRIORITY_COLORS[priority] ?? "#6366f1";
            return (
              <div className="flex items-center gap-1 overflow-hidden w-full px-1 py-0.5 text-[10px] font-bold" style={{ color }}>
                <CheckSquare style={{ width: 10, height: 10, flexShrink: 0 }} />
                <span className="truncate">{arg.event.title}</span>
              </div>
            );
          }

          if (isMonthView) {
            return (
              <div className="flex items-center gap-1.5 overflow-hidden w-full text-white px-1 py-0.5 text-[11px] font-semibold">
                {arg.event.extendedProps.isTeam && <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-white/60" />}
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />}
                {arg.timeText && <span className="font-bold text-[9px] opacity-85 shrink-0 mr-0.5">{arg.timeText}</span>}
                <span className="truncate flex-1 font-bold">{arg.event.title}</span>
              </div>
            );
          }

          return (
            <div className="flex flex-col h-full overflow-hidden p-0.5 text-white">
              <div className="flex items-start gap-1">
                {arg.event.extendedProps.isTeam && <span className="shrink-0 h-2 w-2 rounded-full bg-white/40 mt-1" />}
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-90 flex-none" />}
                <span className="fc-event-title flex-1 break-words leading-tight font-bold text-[11px]">{arg.event.title}</span>
              </div>
              {arg.timeText && <span className="fc-event-time text-[10px] font-medium opacity-90 mt-1">{arg.timeText}</span>}
            </div>
          );
        }}
      />

      {/* ── Create Event Modal ── */}
      {selectedRange && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm animate-fade-in" onClick={() => { setSelectedRange(null); calendarRef.current?.getApi().unselect(); }} />
          <div className="relative w-full max-w-md animate-scale-up rounded-3xl bg-white border border-border shadow-2xl overflow-hidden z-10">
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span className="flex h-7 w-7 rounded-xl bg-indigo-50 text-indigo-600 items-center justify-center shadow-sm"><CalendarPlus className="h-4 w-4" /></span>
                  Schedule Event
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Create a new slot on your calendar.</p>
              </div>
              <button onClick={() => { setSelectedRange(null); calendarRef.current?.getApi().unselect(); }} className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-muted-foreground transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1.5">Title</label>
                <input name="title" required autoFocus placeholder="What is this event for?" className="w-full h-10 rounded-xl border border-white/80 bg-slate-50 px-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white transition-all shadow-sm" />
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1.5">Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(EVENT_COLOR).map(key => (
                    <label key={key} className="cursor-pointer">
                      <input type="radio" name="event_type" value={key} className="sr-only peer" defaultChecked={key === "meeting"} />
                      <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:shadow-sm cursor-pointer hover:bg-white bg-slate-50/50 select-none" style={{ color: EVENT_COLOR[key], borderColor: EVENT_COLOR[key] + "40" }}>
                        {EVENT_LABEL[key] ?? key}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1.5">Date</label>
                <input name="date" type="date" required defaultValue={selectedRange.date} className="w-full h-10 rounded-xl border border-white/80 bg-slate-50 px-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white transition-all shadow-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1.5">Start Time</label>
                  <input name="start_time" type="time" required defaultValue={selectedRange.startTime} className="w-full h-10 rounded-xl border border-white/80 bg-slate-50 px-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white transition-all shadow-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1.5">End Time</label>
                  <input name="end_time" type="time" required defaultValue={selectedRange.endTime} className="w-full h-10 rounded-xl border border-white/80 bg-slate-50 px-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white transition-all shadow-sm" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1.5">Description <span className="font-normal normal-case">(optional)</span></label>
                <textarea name="description" placeholder="Add notes, agenda, or a link…" rows={2} maxLength={280} className="w-full rounded-xl border border-white/80 bg-slate-50 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white transition-all shadow-sm" />
              </div>
              <label className="flex items-start gap-3.5 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 cursor-pointer hover:bg-indigo-100/50 transition-all group shadow-sm">
                <input type="checkbox" name="is_team" className="mt-0.5 h-4 w-4 rounded accent-indigo-600 cursor-pointer" />
                <div>
                  <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Visible to team</p>
                  <p className="text-[10px] font-medium text-indigo-600/70 mt-0.5 leading-relaxed">Teammates will see this event on the Team Calendar.</p>
                </div>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-border/80">
                <button type="button" onClick={() => { setSelectedRange(null); calendarRef.current?.getApi().unselect(); }} className="rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" disabled={pending} className="rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-xs font-extrabold shadow-md hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5">
                  {pending ? "Scheduling…" : "Save Event"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Event Details / Edit Modal ── */}
      {activeEvent && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm animate-fade-in" onClick={() => { setActiveEvent(null); setEditMode(false); }} />
          <div className="relative w-full max-w-md animate-scale-up rounded-3xl bg-white border border-border shadow-2xl overflow-hidden z-10">
            <div className="h-1.5 w-full" style={{ background: EVENT_COLOR[activeEvent.event_type] ?? "#4f46e5" }} />

            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span className="flex h-7 w-7 rounded-xl items-center justify-center shadow-sm text-white" style={{ background: EVENT_COLOR[activeEvent.event_type] ?? "#4f46e5" }}>
                    {EVENT_ICON[activeEvent.event_type] ? (() => { const Icon = EVENT_ICON[activeEvent.event_type]; return <Icon className="h-4 w-4" />; })() : <Calendar className="h-4 w-4" />}
                  </span>
                  {editMode ? "Edit Event" : "Event Details"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{editMode ? "Make your changes below." : "Scoped calendar entry details."}</p>
              </div>
              <button onClick={() => { setActiveEvent(null); setEditMode(false); }} className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-muted-foreground transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {editMode ? (
                /* ── Edit form ── */
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1">Title</label>
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full h-10 rounded-xl border border-border bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1">Type</label>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(EVENT_COLOR).map(key => (
                        <button key={key} type="button" onClick={() => setEditType(key)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${editType === key ? "ring-2 ring-offset-1 shadow-sm" : "opacity-60 hover:opacity-90"}`}
                          style={{ color: EVENT_COLOR[key], borderColor: EVENT_COLOR[key] + "40" }}
                        >
                          {EVENT_LABEL[key] ?? key}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1">Start</label>
                      <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)} className="w-full h-10 rounded-xl border border-border bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1">End</label>
                      <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="w-full h-10 rounded-xl border border-border bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1">Description</label>
                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} maxLength={280} className="w-full rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                </div>
              ) : (
                /* ── Read view ── */
                <div className="bg-slate-50 p-4 rounded-2xl border border-border/80">
                  <h3 className="text-base font-bold text-foreground leading-snug">{activeEvent.title}</h3>
                  {(activeEvent as any).description && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{(activeEvent as any).description}</p>
                  )}
                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground/60" />
                      <span className="font-semibold text-slate-700">{new Date(activeEvent.start_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground/60" />
                      <span className="font-semibold text-slate-700">{new Date(activeEvent.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – {new Date(activeEvent.end_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-2 w-2 rounded-full" style={{ background: EVENT_COLOR[activeEvent.event_type] ?? "#4f46e5" }} />
                      <span className="font-semibold capitalize text-slate-700">Type: {EVENT_LABEL[activeEvent.event_type] ?? activeEvent.event_type}</span>
                    </div>
                    {activeEvent.is_team && (
                      <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50/50 border border-indigo-100/40 px-2.5 py-1.5 rounded-xl w-fit font-bold text-[10px]">
                        <Globe className="h-3.5 w-3.5 shrink-0" />Visible to entire team
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center gap-2 pt-2 border-t border-border/80">
                {activeEvent.owner_id === currentUserId ? (
                  <div className="flex gap-2">
                    {!editMode ? (
                      <>
                        <button type="button" onClick={() => setEditMode(true)} className="rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 px-3 py-2 text-xs font-bold hover:bg-indigo-100 transition-all cursor-pointer flex items-center gap-1.5">
                          <Edit2 className="h-3.5 w-3.5" />Edit
                        </button>
                        <button type="button" onClick={handleEventDelete} disabled={pending} className="rounded-xl border border-red-200 bg-red-50 text-red-600 px-3 py-2 text-xs font-bold hover:bg-red-100 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5">
                          <Trash2 className="h-3.5 w-3.5" />{pending ? "Deleting…" : "Delete"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={handleSaveEdit} disabled={saving} className="rounded-xl bg-indigo-600 text-white px-3 py-2 text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save"}
                        </button>
                        <button type="button" onClick={() => setEditMode(false)} className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-slate-50 cursor-pointer">Cancel</button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground italic">
                    Scheduled by {activeEvent.profiles ? `${activeEvent.profiles.first_name} ${activeEvent.profiles.last_name}` : "Teammate"}
                  </div>
                )}
                {!editMode && (
                  <button type="button" onClick={() => { setActiveEvent(null); setEditMode(false); }} className="rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-bold text-foreground hover:bg-slate-50 cursor-pointer ml-auto">Close</button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
