"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { STATUS_COLOUR, STATUS_LABEL } from "@/lib/realtime/presence";
import type { ActivityStatus } from "@/lib/supabase/types";
import { ChevronDown } from "lucide-react";

const ALL: ActivityStatus[] = [
  "available", "tasking", "meeting", "lunch_break", "personal_time", "training", "offline",
];

export function ActivityStatusPicker({
  businessMemberId,
  initial,
}: {
  businessMemberId: string;
  initial: ActivityStatus;
}) {
  const [status, setStatus] = useState<ActivityStatus>(initial);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function pick(next: ActivityStatus) {
    setStatus(next);
    setOpen(false);
    startTransition(async () => {
      await supabase.from("activity_status").upsert({
        business_member_id: businessMemberId,
        status: next,
      });
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm hover:bg-accent transition-all"
      >
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0 relative"
          style={{ background: STATUS_COLOUR[status], boxShadow: `0 0 8px ${STATUS_COLOUR[status]}` }}
        />
        <span className="font-medium">{STATUS_LABEL[status]}</span>
        <ChevronDown className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-border bg-white shadow-xl shadow-gray-200 overflow-hidden">
          {ALL.map((s) => (
            <button
              key={s}
              onClick={() => pick(s)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-accent transition-colors ${s === status ? "bg-primary/10 text-primary" : "text-foreground"}`}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: STATUS_COLOUR[s], boxShadow: s === status ? `0 0 6px ${STATUS_COLOUR[s]}` : "none" }}
              />
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
