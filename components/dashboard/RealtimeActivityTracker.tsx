"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { STATUS_COLOUR, STATUS_LABEL } from "@/lib/realtime/presence";
import type { ActivityStatus } from "@/lib/supabase/types";

type Row = {
  business_member_id: string;
  user_name: string;
  status: ActivityStatus;
};

function initials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic colour from name (same person always same colour)
const PALETTE = ["#4f46e5", "#f97316", "#10b981", "#f43f5e", "#0ea5e9", "#eab308", "#a855f7", "#06b6d4"];
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
          const updated = payload.new as { business_member_id: string; status: ActivityStatus } | undefined;
          if (!updated) return;
          setRows((prev) =>
            prev.map((r) =>
              r.business_member_id === updated.business_member_id
                ? { ...r, status: updated.status }
                : r
            )
          );
          setUpdates((prev) => [...prev.slice(-10), { key: updated.business_member_id, ts: Date.now() }]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [businessId]);

  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground italic">No team members yet.</p>;

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const recentUpdate = updates.find((u) => u.key === r.business_member_id);
        const isRecent = recentUpdate && Date.now() - recentUpdate.ts < 10_000;
        const color = avatarColor(r.user_name);

        return (
          <div
            key={r.business_member_id}
            className="flex items-center gap-3 rounded-2xl bg-muted/40 border border-border px-4 py-3"
          >
            {/* Avatar */}
            <div
              className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: color, boxShadow: `0 2px 8px -2px ${color}66` }}
            >
              {initials(r.user_name)}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="text-sm">
                <span className="font-semibold text-gray-900">{r.user_name}</span>
                <span className="text-muted-foreground"> {ACTION[r.status]}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {isRecent ? "just now" : STATUS_LABEL[r.status]}
              </div>
            </div>

            {/* Status dot */}
            <div className="relative h-2.5 w-2.5 shrink-0">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: STATUS_COLOUR[r.status] }}
              />
              {(r.status === "available" || isRecent) && (
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-50"
                  style={{ background: STATUS_COLOUR[r.status] }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
