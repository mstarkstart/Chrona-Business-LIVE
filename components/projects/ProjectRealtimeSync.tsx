"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface ProjectRealtimeSyncProps {
  projectId: string;
}

export function ProjectRealtimeSync({ projectId }: ProjectRealtimeSyncProps) {
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel(`project:${projectId}`)
      // Listen to task changes in this project
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          router.refresh();
        }
      )
      // Listen to changes on the project itself
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `id=eq.${projectId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, router]);

  return null;
}
