"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { STATUS_COLOUR, STATUS_LABEL } from "@/lib/realtime/presence";
import type { ActivityStatus } from "@/lib/supabase/types";

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
  const [, startTransition] = useTransition();
  const router = useRouter();

  function pick(next: ActivityStatus) {
    setStatus(next);
    startTransition(async () => {
      await supabase.from("activity_status").upsert({
        business_member_id: businessMemberId,
        status: next,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOUR[status] }} />
        <span className="text-sm font-medium">{STATUS_LABEL[status]}</span>
      </div>
      <select
        value={status}
        onChange={(e) => pick(e.target.value as ActivityStatus)}
        className="flex h-8 w-full rounded-md border border-border bg-card px-2 text-xs"
      >
        {ALL.map((s) => (
          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
        ))}
      </select>
    </div>
  );
}
