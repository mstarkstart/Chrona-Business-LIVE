import React from "react";
import { BellRing, Clock } from "lucide-react";
import { EVENT_COLOR } from "./constants";

type Event = {
  id: string;
  title: string;
  start_at: string;
  event_type: string;
};

export function UpcomingReminders({ events }: { events: Event[] }) {
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Filter events starting between now and 24 hours from now
  const upcoming = events
    .filter((e) => {
      const start = new Date(e.start_at);
      return start > now && start <= next24h;
    })
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, 5); // take max 5

  return (
    <div className="glass-card rounded-3xl p-5 shadow-lg shadow-indigo-900/5 bg-white/60 backdrop-blur-xl border border-white/60 relative overflow-hidden mt-4">
      {/* Decorative blurred blob */}
      <div className="absolute -bottom-10 -right-10 p-24 bg-rose-400/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      
      <h2 className="text-sm font-extrabold tracking-wide text-foreground mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-rose-100 flex items-center justify-center">
            <BellRing className="h-3.5 w-3.5 text-rose-600 animate-pulse-soft" />
          </div>
          Upcoming (24h)
        </div>
        <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">
          {upcoming.length}
        </span>
      </h2>

      {upcoming.length === 0 ? (
        <div className="text-center p-4 border border-dashed border-rose-200 rounded-2xl bg-white/40">
          <p className="text-xs font-semibold text-rose-900/50">No upcoming events</p>
          <p className="text-[10px] text-rose-900/40 mt-1">You're all caught up!</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {upcoming.map((event) => {
            const start = new Date(event.start_at);
            const timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            const color = EVENT_COLOR[event.event_type] || EVENT_COLOR.other;
            
            // Calculate relative time (e.g., "in 2 hours")
            const diffHours = Math.floor((start.getTime() - now.getTime()) / (1000 * 60 * 60));
            const diffMins = Math.floor((start.getTime() - now.getTime()) / (1000 * 60)) % 60;
            const relativeTime = diffHours > 0 
              ? `in ${diffHours}h ${diffMins}m` 
              : `in ${diffMins}m`;

            return (
              <li 
                key={event.id} 
                className="group flex flex-col p-3 rounded-2xl bg-white/80 border border-white hover:border-rose-100 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden"
              >
                {/* Left accent color strip */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: color }}
                />
                
                <div className="pl-2 flex justify-between items-start gap-2">
                  <span className="text-xs font-bold text-slate-800 line-clamp-1">{event.title}</span>
                  <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {timeStr}
                  </span>
                </div>
                
                <div className="pl-2 mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-rose-600 bg-rose-50 w-fit px-2 py-0.5 rounded-full border border-rose-100/50">
                  <Clock className="h-2.5 w-2.5" />
                  {relativeTime}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
