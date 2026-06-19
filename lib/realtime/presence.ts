import { supabase } from "@/lib/supabase/client";
import type { ActivityStatus } from "@/lib/supabase/types";

export type PresenceRow = {
  workspace_member_id: string;
  status: ActivityStatus;
  updated_at: string;
};

export function subscribeActivity(
  businessId: string,
  onChange: (row: PresenceRow) => void
) {
  const channelId = `presence:${businessId}:${Math.random().toString(36).substring(2)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "activity_status" },
      (payload) => {
        const row = (payload.new ?? payload.old) as PresenceRow | undefined;
        if (row) onChange(row);
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export const STATUS_COLOUR: Record<ActivityStatus, string> = {
  available:     "#22c55e",
  tasking:       "#eab308",
  meeting:       "#f97316",
  lunch_break:   "#3b82f6",
  personal_time: "#ef4444",
  training:      "#6b7280",
  offline:       "#9ca3af",
};

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  available:     "Available",
  tasking:       "Tasking",
  meeting:       "Meeting",
  lunch_break:   "Lunch / Break",
  personal_time: "Personal Time",
  training:      "Training",
  offline:       "Offline",
};

export const STATUS_EMOJI: Record<ActivityStatus, string> = {
  available:     "🟢",
  tasking:       "⚡",
  meeting:       "📅",
  lunch_break:   "🍽️",
  personal_time: "🔴",
  training:      "📚",
  offline:       "⚫",
};
