"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export function DashboardRealtimeSync({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();

  useEffect(() => {
    // 1. Subscribe to tasks table changes for this workspace
    const tasksChannel = supabase
      .channel(`dashboard-tasks-sync:${workspaceId}`)
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

    // 2. Subscribe to activity_status changes for real-time online count & status updates
    const activityChannel = supabase
      .channel(`dashboard-activity-sync:${workspaceId}`)
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

    // 3. Subscribe to approval_requests changes
    const approvalsChannel = supabase
      .channel(`dashboard-approvals-sync:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "approval_requests",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(approvalsChannel);
    };
  }, [workspaceId, router]);

  return null;
}
