"use client";

import { useEffect, useState } from "react";

type Activity = {
  id: number;
  name: string;
  initial: string;
  color: string;
  action: string;
  detail: string;
  time: string;
};

const POOL: Omit<Activity, "id" | "time">[] = [
  { name: "Olivia Carter",  initial: "OC", color: "#4f46e5", action: "completed",     detail: "Q3 roadmap proposal" },
  { name: "Marcus Lee",     initial: "ML", color: "#f97316", action: "joined meeting",detail: "Engineering standup" },
  { name: "Hana Mori",      initial: "HM", color: "#f43f5e", action: "approved",      detail: "Detailing department" },
  { name: "Sam Park",       initial: "SP", color: "#10b981", action: "started",       detail: "Frontend refactor" },
  { name: "Diego Alvarez",  initial: "DA", color: "#0ea5e9", action: "assigned",      detail: "Backend migration to Lena" },
  { name: "Aiden Brooks",   initial: "AB", color: "#eab308", action: "set status",    detail: "Tasking until 4pm" },
  { name: "Cleo Tanaka",    initial: "CT", color: "#a855f7", action: "scheduled",     detail: "Customer demo prep" },
  { name: "Lena Hofmann",   initial: "LH", color: "#06b6d4", action: "completed",     detail: "Performance regression fix" },
];

function relTime(secondsAgo: number) {
  if (secondsAgo < 60) return "just now";
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  return `${Math.floor(secondsAgo / 3600)}h ago`;
}

export function LiveTicker() {
  const [items, setItems] = useState<Activity[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Seed
    const now = Date.now();
    const seeded = POOL.slice(0, 4).map((p, i) => ({
      ...p,
      id: now - i * 1000,
      time: relTime(20 + i * 60),
    }));
    setItems(seeded);

    // Add new activity every 4-5 seconds
    const addInterval = setInterval(() => {
      const fresh = POOL[Math.floor(Math.random() * POOL.length)];
      setItems((prev) => [
        { ...fresh, id: Date.now(), time: "just now" },
        ...prev.slice(0, 4),
      ]);
    }, 4500);

    // Refresh relative times every 30 seconds
    const tickInterval = setInterval(() => setTick((t) => t + 1), 30_000);

    return () => {
      clearInterval(addInterval);
      clearInterval(tickInterval);
    };
  }, []);

  // Re-derive times on tick
  useEffect(() => {
    setItems((prev) =>
      prev.map((it, i) => ({
        ...it,
        time: i === 0 ? "just now" : relTime(30 + i * 60 + tick * 30),
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return (
    <div className="space-y-2">
      {items.map((a, i) => (
        <div
          key={a.id}
          className="animate-ticker flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-border px-4 py-3"
          style={{ animationDelay: `${i * 50}ms`, opacity: 1 - i * 0.12 }}
        >
          <div
            className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ background: a.color, boxShadow: `0 4px 12px -2px ${a.color}55` }}
          >
            {a.initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm">
              <span className="font-semibold text-gray-900">{a.name}</span>
              <span className="text-muted-foreground"> {a.action} </span>
              <span className="font-medium text-gray-700">{a.detail}</span>
            </div>
            <div className="text-xs text-muted-foreground">{a.time}</div>
          </div>
          <div className="relative h-2 w-2 shrink-0" style={{ color: a.color }}>
            <div className={`absolute inset-0 rounded-full ${i === 0 ? "pulse-dot" : ""}`} style={{ background: a.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
