"use client";

import { useState } from "react";
import { updateActivityStatus } from "@/lib/tasks/mutations";
import { STATUS_COLOUR, STATUS_LABEL, STATUS_EMOJI } from "@/lib/realtime/presence";
import type { ActivityStatus } from "@/lib/supabase/types";
import { ChevronDown } from "lucide-react";
import { TimeAgo } from "@/components/ui/time-ago";

const ALL: ActivityStatus[] = [
  "available", "tasking", "meeting", "lunch_break", "personal_time", "training", "offline",
];

export function ActivityStatusPicker({
  businessMemberId,
  initial,
  updatedAt,
  onOptimisticUpdate,
}: {
  businessMemberId: string;
  initial: ActivityStatus;
  updatedAt?: string | null;
  onOptimisticUpdate?: (status: ActivityStatus) => void;
}) {
  const [status, setStatus] = useState<ActivityStatus>(initial);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  // Suppress unused prop lint — businessMemberId is passed from layout but the server
  // action reads it from the session cookie, so we keep the prop for future use.
  void businessMemberId;

  async function pick(next: ActivityStatus) {
    setStatus(next); // optimistic update internal
    onOptimisticUpdate?.(next); // optimistic update parent
    setOpen(false);
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("status", next);
      await updateActivityStatus(fd);
    } catch (err) {
      console.error("[ActivityStatusPicker] status update failed:", err);
      // Revert optimistic update on failure
      setStatus(status);
      onOptimisticUpdate?.(status);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="w-full flex items-center gap-2.5 rounded-xl border border-white/15 bg-[rgba(18,18,28,0.42)] backdrop-blur-[16px] px-3 py-2.5 text-sm hover:bg-[rgba(18,18,28,0.55)] transition-all disabled:opacity-60 shadow-[0_2px_12px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.10)]"
      >
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0 relative"
          style={{ background: STATUS_COLOUR[status], boxShadow: `0 0 8px ${STATUS_COLOUR[status]}` }}
        />
        <span className="font-medium flex-1 text-left flex items-center gap-2 text-white/90">
          {STATUS_LABEL[status]}
          <span className="text-[10px] text-white/40 font-normal">
            ⏱️ <TimeAgo dateString={updatedAt} />
          </span>
        </span>
        <span className="text-base leading-none mr-1">{STATUS_EMOJI[status]}</span>
        {pending && <span className="ml-1 text-[10px] text-white/40">(saving…)</span>}
        <ChevronDown className={`shrink-0 ml-auto h-3.5 w-3.5 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-white/15 bg-[rgba(18,18,28,0.55)] backdrop-blur-[32px] shadow-[0_16px_48px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.09)_inset] overflow-hidden animate-fade-in">
          {ALL.map((s) => (
            <button
              key={s}
              onClick={() => pick(s)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                s === status ? "bg-white/10 text-white font-medium" : "text-white/80 hover:bg-white/[0.06]"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: STATUS_COLOUR[s], boxShadow: s === status ? `0 0 6px ${STATUS_COLOUR[s]}` : "none" }}
              />
              <span className="flex-1 text-left">{STATUS_LABEL[s]}</span>
              <span className="shrink-0 text-base leading-none">{STATUS_EMOJI[s]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
