"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

/**
 * Subscribes to real-time changes on the `tasks` and `notifications` tables
 * for the current workspace/user and calls router.refresh() so the page's
 * Server Component re-runs and shows up-to-date data — without a manual reload.
 *
 * Drop this into any Server Component page that displays task data.
 */
export function TasksRealtimeSync({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    // 1. Watch ALL task mutations in this workspace (assignments, status changes, etc.)
    const tasksChannel = supabase
      .channel(`tasks-page-sync:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    // 2. Watch notifications for this user so inbox/bell updates instantly
    const notifChannel = supabase
      .channel(`tasks-notif-sync:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(notifChannel);
    };
  }, [workspaceId, userId, router]);

  return null;
}
