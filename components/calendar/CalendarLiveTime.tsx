"use client";

import { useEffect, useState } from "react";

const HOURS_START   = 7;
const HOURS_END     = 22;
const PX_PER_HOUR   = 56;

/**
 * Renders the red "current time" line in the week view.
 * Updates every 60 seconds via setInterval.
 */
export function CalendarLiveTimeLine({ todayColIndex }: { todayColIndex: number }) {
  const [nowPct, setNowPct] = useState<number | null>(null);

  function calc() {
    const n = new Date();
    const h = n.getHours() + n.getMinutes() / 60;
    if (h < HOURS_START || h > HOURS_END) { setNowPct(null); return; }
    setNowPct((h - HOURS_START) * PX_PER_HOUR);
  }

  useEffect(() => {
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, []);

  if (nowPct === null) return null;

  return (
    <div
      className="absolute z-20 flex items-center pointer-events-none"
      style={{
        top: nowPct,
        // position within the day column grid — skip the 52px time label column
        left: `calc(52px + ${todayColIndex} * (100% - 52px) / 7)`,
        width: `calc((100% - 52px) / 7)`,
      }}
    >
      <div className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0 -ml-1.5 shadow-sm" />
      <div className="flex-1 h-[2px] bg-red-500 opacity-75" />
    </div>
  );
}

/**
 * "NOW" badge + live check for today's agenda events.
 * Pass the event's start_at and end_at ISO strings.
 */
export function NowBadge({ startAt, endAt }: { startAt: string; endAt: string }) {
  const [isNow, setIsNow] = useState(false);

  function check() {
    const n = new Date();
    setIsNow(new Date(startAt) <= n && new Date(endAt) >= n);
  }

  useEffect(() => {
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [startAt, endAt]);

  if (!isNow) return null;

  return (
    <span className="absolute top-2 right-3 text-[9px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 animate-pulse-soft">
      NOW
    </span>
  );
}
