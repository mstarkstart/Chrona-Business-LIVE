"use client";

import { useEffect, useState } from "react";
import { subscribeActivity, STATUS_COLOUR, STATUS_LABEL } from "@/lib/realtime/presence";
import type { ActivityStatus } from "@/lib/supabase/types";

type Row = { business_member_id: string; user_name: string; status: ActivityStatus };

export function LiveActivityList({
  businessId,
  initial,
}: {
  businessId: string;
  initial: Row[];
}) {
  const [rows, setRows] = useState<Row[]>(initial);

  useEffect(() => {
    const unsubscribe = subscribeActivity(businessId, (change) => {
      setRows((prev) =>
        prev.map((r) =>
          r.business_member_id === change.business_member_id
            ? { ...r, status: change.status }
            : r
        )
      );
    });
    return unsubscribe;
  }, [businessId]);

  if (rows.length === 0) {
    return <li className="text-xs text-muted-foreground italic">No teammates yet.</li>;
  }

  return (
    <>
      {rows.map((r) => (
        <li key={r.business_member_id} className="flex items-center gap-2 py-1 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOUR[r.status] }} title={STATUS_LABEL[r.status]} />
          <span className="truncate">{r.user_name}</span>
        </li>
      ))}
    </>
  );
}
