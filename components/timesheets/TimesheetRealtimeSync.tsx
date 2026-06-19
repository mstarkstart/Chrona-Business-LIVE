"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface TimesheetRealtimeSyncProps {
  workspaceId: string;
}

export function TimesheetRealtimeSync({ workspaceId }: TimesheetRealtimeSyncProps) {
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel(`timesheets:${workspaceId}`)
      // Listen to activity log updates (starting, stopping, deleting logs)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_log",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          router.refresh();
        }
      )
      // Listen to status changes (e.g. member is training, meeting, tasking)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_status",
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, router]);

  return null;
}
