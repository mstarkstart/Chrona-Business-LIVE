"use client";

import { useEffect, useState } from "react";
import { ProgressBar } from "@/components/dashboard/Cards";

type Evt = { start_at: string; end_at: string };

function calcProgress(events: Evt[]) {
  const now = new Date();
  const totalMins = events.reduce((acc, e) => {
    const s = new Date(e.start_at), en = new Date(e.end_at);
    return acc + Math.max(0, (en.getTime() - s.getTime()) / 60000);
  }, 0);
  const elapsedMins = events.reduce((acc, e) => {
    const s = new Date(e.start_at), en = new Date(e.end_at);
    if (en <= now) return acc + (en.getTime() - s.getTime()) / 60000;
    if (s <= now)  return acc + (now.getTime() - s.getTime()) / 60000;
    return acc;
  }, 0);
  return { pct: totalMins === 0 ? 0 : Math.round((elapsedMins / totalMins) * 100), totalMins };
}

/**
 * Live-updating progress bar for today's calendar blocks.
 * Recalculates every minute so the bar advances in real time.
 */
export function CalendarProgress({ events }: { events: Evt[] }) {
  const [pct, setPct] = useState(() => calcProgress(events).pct);
  const [totalMins]   = useState(() => calcProgress(events).totalMins);

  useEffect(() => {
    const id = setInterval(() => {
      setPct(calcProgress(events).pct);
    }, 60_000);
    return () => clearInterval(id);
  }, [events]);

  if (totalMins === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Day Progress</h2>
        <span className="text-xs text-muted-foreground">
          {Math.round((pct / 100) * totalMins)}m of {Math.round(totalMins)}m complete
        </span>
      </div>
      <ProgressBar percent={pct} color="#4f46e5" />
    </div>
  );
}
