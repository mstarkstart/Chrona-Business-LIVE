"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

/**
 * Listens for calendar_events changes from Supabase Realtime.
 * On any INSERT/UPDATE/DELETE: refreshes the current page so new events appear
 * without a manual page reload.
 */
export function CalendarRealtimeSync({
  workspaceId,
  ownerId,
}: {
  workspaceId: string;
  ownerId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel(`calendar:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "calendar_events",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          router.refresh();
        }
      )
      .on(
        "broadcast",
        { event: "calendar_updated" },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, ownerId, router]);

  return null; // purely behavioral, renders nothing
}
