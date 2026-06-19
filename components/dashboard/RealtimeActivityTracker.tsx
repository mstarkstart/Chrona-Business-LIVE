"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { STATUS_COLOUR, STATUS_LABEL } from "@/lib/realtime/presence";
import type { ActivityStatus } from "@/lib/supabase/types";

const STATUS_WEIGHT: Record<ActivityStatus, number> = {
  tasking: 10,
  meeting: 9,
  training: 8,
  available: 7,
  lunch_break: 5,
  personal_time: 4,
  offline: 1,
};

type Row = {
  workspace_member_id: string;
  user_name: string;
  status: ActivityStatus;
  avatar_url?: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic colour from name (same person always same colour)
const PALETTE = ["#6366f1", "#fb923c", "#34d399", "#fb7185", "#38bdf8", "#fbbf24", "#c084fc", "#22d3ee"];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % PALETTE.length;
  return PALETTE[h];
}

const ACTION: Record<ActivityStatus, string> = {
  available:     "is available",
  tasking:       "is working on a task",
  meeting:       "is in a meeting",
  lunch_break:   "is on lunch / break",
  personal_time: "has personal time",
  training:      "is in training",
  offline:       "went offline",
};

export function RealtimeActivityTracker({
  businessId,
  initial,
}: {
  businessId: string;
  initial: Row[];
}) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [updates, setUpdates] = useState<{ key: string; ts: number }[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel(`dashboard:${businessId}:activity`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_status" },
        (payload) => {
          const updated = payload.new as { workspace_member_id: string; status: ActivityStatus } | undefined;
          if (!updated) return;
          setRows((prev) =>
            prev.map((r) =>
              r.workspace_member_id === updated.workspace_member_id
                ? { ...r, status: updated.status }
                : r
            )
          );
          setUpdates((prev) => [...prev.slice(-10), { key: updated.workspace_member_id, ts: Date.now() }]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [businessId]);

  const [showAll, setShowAll] = useState(false);

  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground italic">No team members yet.</p>;

  const sorted = [...rows].sort((a, b) => STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status]);
  const MAX_VISIBLE = 5;
  const displayRows = (!showAll && sorted.length > MAX_VISIBLE) ? sorted.slice(0, MAX_VISIBLE) : sorted;

  return (
    <div className="space-y-3">
      {displayRows.map((r) => {
        const recentUpdate = updates.find((u) => u.key === r.workspace_member_id);
        const isRecent = recentUpdate && Date.now() - recentUpdate.ts < 10_000;
        const color = avatarColor(r.user_name);

        return (
          <div
            key={r.workspace_member_id}
            className="flex items-center justify-between rounded-xl bg-card border border-border px-4 py-3.5 hover:bg-slate-50/50 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {r.avatar_url ? (
                <img
                  src={r.avatar_url}
                  alt={r.user_name}
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-black/5"
                />
              ) : (
                <div
                  className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white select-none"
                  style={{ background: color, boxShadow: `0 2px 8px -2px ${color}66` }}
                >
                  {initials(r.user_name)}
                </div>
              )}

              {/* Text */}
              <div className="min-w-0">
                <div className="text-sm">
                  <span className="font-semibold text-foreground">{r.user_name}</span>
                  <span className="text-muted-foreground"> {ACTION[r.status]}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {isRecent ? "just now" : STATUS_LABEL[r.status]}
                </div>
              </div>
            </div>

            {/* Status dot */}
            <div className="relative h-3 w-3 shrink-0">
              <div
                className="absolute inset-0.5 rounded-full status-spark"
                style={{
                  background: STATUS_COLOUR[r.status],
                  ["--spark-color" as string]: STATUS_COLOUR[r.status],
                }}
              />
              {(r.status === "available" || r.status === "tasking" || isRecent) && (
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-30"
                  style={{ background: STATUS_COLOUR[r.status] }}
                />
              )}
            </div>
          </div>
        );
      })}

      {rows.length > MAX_VISIBLE && (
        <button 
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-2 py-2 rounded-xl border border-border bg-slate-50/50 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
        >
          {showAll ? "Show less" : `Show all (${rows.length})`}
        </button>
      )}
    </div>
  );
}
