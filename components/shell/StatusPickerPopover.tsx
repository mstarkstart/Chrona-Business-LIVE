"use client";

import { useEffect, useRef, useState } from "react";
import { updateActivityStatus } from "@/lib/tasks/mutations";
import { STATUS_COLOUR, STATUS_LABEL, STATUS_EMOJI } from "@/lib/realtime/presence";
import type { ActivityStatus } from "@/lib/supabase/types";
import { TimeAgo } from "@/components/ui/time-ago";

const ALL: ActivityStatus[] = [
  "available", "tasking", "meeting", "lunch_break", "personal_time", "training", "offline",
];

export function StatusPickerPopover({
  initial,
  updatedAt,
  avatarUrl,
  userName,
  onClose,
  anchorBottom,
  anchorTop,
  align = "left",
  onOptimisticUpdate,
}: {
  initial: ActivityStatus;
  updatedAt?: string | null;
  avatarUrl?: string | null;
  userName: string;
  onClose: () => void;
  anchorBottom?: number;
  anchorTop?: number;
  align?: "left" | "right";
  onOptimisticUpdate?: (status: ActivityStatus) => void;
}) {
  const [status, setStatus] = useState<ActivityStatus>(initial);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function key(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  async function pick(s: ActivityStatus) {
    if (s === status) { onClose(); return; }
    setStatus(s);
    onOptimisticUpdate?.(s);
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("status", s);
      await updateActivityStatus(fd);
    } finally {
      setSaving(false);
      onClose();
    }
  }

  const initials = userName.charAt(0).toUpperCase();
  const color = STATUS_COLOUR[status];

  return (
    <div
      ref={ref}
      className={`fixed z-[200] w-52 rounded-2xl border border-white/10 bg-[rgba(18,18,28,0.82)] backdrop-blur-[32px] shadow-[0_20px_60px_-8px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)_inset] overflow-hidden animate-fade-up ${
        align === "left" ? "left-[76px]" : "right-[64px]"
      }`}
      style={
        anchorTop !== undefined
          ? { top: anchorTop, animationDuration: "0.25s" }
          : { bottom: anchorBottom ?? 64, animationDuration: "0.25s" }
      }
    >
      {/* Avatar + current status header */}
      <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-white/[0.08] bg-gradient-to-r from-indigo-500/10 to-violet-500/5">
        <div className="relative shrink-0">
          <span
            className="absolute inset-[-3px] rounded-full status-spark pointer-events-none"
            style={{ border: `2px solid ${color}`, ["--spark-color" as string]: color }}
          />
          <div className="h-7 w-7 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white relative z-10">
            {avatarUrl
              ? <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
              : initials}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{userName}</p>
          <div className="flex items-center gap-1">
            <p className="text-[10px] font-semibold" style={{ color }}>{STATUS_LABEL[status]}</p>
            <span className="text-[9px] text-white/30">•</span>
            <p className="text-[9px] text-white/40">⏱️ <TimeAgo dateString={updatedAt} /></p>
          </div>
        </div>
      </div>

      {/* Status options */}
      <div className="py-1">
        {ALL.map((s) => {
          const c = STATUS_COLOUR[s];
          const active = s === status;
          return (
            <button
              key={s}
              onClick={() => pick(s)}
              disabled={saving}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors cursor-pointer group ${
                active ? "bg-white/[0.10]" : "hover:bg-white/[0.06]"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0 transition-shadow"
                style={{
                  background: c,
                  boxShadow: active ? `0 0 7px 2px ${c}77` : `0 0 3px ${c}44`,
                }}
              />
              <span className="flex-1 text-left font-medium text-white/90">{STATUS_LABEL[s]}</span>
              <span className="shrink-0 text-base leading-none">{STATUS_EMOJI[s]}</span>
              {active && (
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: c }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
