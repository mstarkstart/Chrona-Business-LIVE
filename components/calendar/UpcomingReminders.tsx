import React from "react";
import { BellRing, Clock, Calendar, ChevronRight } from "lucide-react";
import { EVENT_COLOR, EVENT_LABEL, EVENT_ICON } from "./constants";

type Event = {
  id: string;
  title: string;
  start_at: string;
  end_at?: string;
  event_type: string;
};

export function UpcomingReminders({ events }: { events: Event[] }) {
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcoming = events
    .filter((e) => {
      const start = new Date(e.start_at);
      return start > now && start <= next24h;
    })
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, 8);

  // Group by urgency: within 1h = urgent, 1-4h = soon, 4-24h = later
  const urgent = upcoming.filter(e => (new Date(e.start_at).getTime() - now.getTime()) <= 60 * 60 * 1000);
  const soon   = upcoming.filter(e => { const d = new Date(e.start_at).getTime() - now.getTime(); return d > 60 * 60 * 1000 && d <= 4 * 60 * 60 * 1000; });
  const later  = upcoming.filter(e => (new Date(e.start_at).getTime() - now.getTime()) > 4 * 60 * 60 * 1000);

  function EventRow({ event }: { event: Event }) {
    const start = new Date(event.start_at);
    const end   = event.end_at ? new Date(event.end_at) : null;
    const color = EVENT_COLOR[event.event_type] ?? EVENT_COLOR.other;
    const label = EVENT_LABEL[event.event_type] ?? "Event";
    const Icon  = EVENT_ICON[event.event_type] ?? EVENT_ICON.other;

    const timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const endStr  = end ? end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null;

    const diffMs   = start.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs  = Math.floor(diffMins / 60);
    const remMins  = diffMins % 60;
    const relTime  = diffHrs > 0 ? `in ${diffHrs}h ${remMins}m` : `in ${diffMins}m`;

    const durMs   = end ? end.getTime() - start.getTime() : null;
    const durMins = durMs ? Math.round(durMs / 60000) : null;
    const durStr  = durMins
      ? durMins >= 60
        ? `${Math.floor(durMins / 60)}h${durMins % 60 ? ` ${durMins % 60}m` : ""}`
        : `${durMins}m`
      : null;

    const isImminent = diffMins <= 60;

    return (
      <div
        className="group relative flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/70 border border-white/80 hover:border-white hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden"
        style={{ boxShadow: `0 1px 12px ${color}12, inset 0 1px 0 rgba(255,255,255,0.9)` }}
      >
        {/* Left accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: color }} />

        {/* Icon */}
        <div
          className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center ml-1"
          style={{ background: color + "18", border: `1px solid ${color}28` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-slate-800 truncate leading-tight">{event.title}</span>
            <span className="shrink-0 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg whitespace-nowrap">
              {timeStr}{endStr ? ` – ${endStr}` : ""}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Type badge */}
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: color + "18", color, border: `1px solid ${color}28` }}
            >
              {label}
            </span>

            {/* Duration */}
            {durStr && (
              <span className="text-[10px] font-medium text-slate-400 flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {durStr}
              </span>
            )}

            {/* Countdown */}
            <span
              className={`text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full ${
                isImminent
                  ? "bg-rose-50 text-rose-600 border border-rose-100"
                  : "bg-slate-50 text-slate-500 border border-slate-100"
              }`}
            >
              {isImminent && <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse inline-block" />}
              {relTime}
            </span>
          </div>
        </div>

        <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-400 shrink-0 transition-colors" />
      </div>
    );
  }

  function Group({ label, items, dot }: { label: string; items: Event[]; dot: string }) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        </div>
        {items.map(e => <EventRow key={e.id} event={e} />)}
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl p-5 relative"
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.70)",
        boxShadow: "0 2px 24px rgba(100,140,180,0.10), inset 0 1px 0 rgba(255,255,255,0.90)",
      }}
    >
      {/* Decorative blob */}
      <div className="absolute -bottom-8 -right-8 h-32 w-32 bg-rose-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-xl bg-rose-100 flex items-center justify-center">
            <BellRing className="h-4 w-4 text-rose-500" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-slate-800">Upcoming (24h)</h2>
            <p className="text-[10px] text-slate-400 font-medium">
              {upcoming.length === 0 ? "No events scheduled" : `${upcoming.length} event${upcoming.length !== 1 ? "s" : ""} ahead`}
            </p>
          </div>
        </div>
        {upcoming.length > 0 && (
          <span className="text-[11px] font-black bg-rose-500 text-white px-2.5 py-0.5 rounded-full shadow-sm">
            {upcoming.length}
          </span>
        )}
      </div>

      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-slate-300" />
          </div>
          <p className="text-xs font-semibold text-slate-400">All clear!</p>
          <p className="text-[10px] text-slate-300">Nothing scheduled in the next 24 hours.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <Group label="Starting soon" items={urgent} dot="bg-rose-400 animate-pulse" />
          <Group label="In a few hours" items={soon}   dot="bg-amber-400" />
          <Group label="Later today"    items={later}  dot="bg-indigo-300" />
        </div>
      )}
    </div>
  );
}
