import type { LucideIcon } from "lucide-react";
import { Video, CheckSquare, Coffee, Utensils, GraduationCap, Target, MoreHorizontal } from "lucide-react";

export const EVENT_COLOR: Record<string, string> = {
  meeting:    "#6366f1", // Indigo 500
  task_block: "#ec4899", // Pink 500
  break:      "#14b8a6", // Teal 500
  lunch:      "#f59e0b", // Amber 500
  training:   "#8b5cf6", // Violet 500
  focus:      "#ef4444", // Red 500
  other:      "#64748b", // Slate 500
};

export const EVENT_LABEL: Record<string, string> = {
  meeting: "Meeting", task_block: "Task Block", break: "Break",
  lunch: "Lunch", training: "Training", focus: "Focus", other: "Other",
};

export const EVENT_ICON: Record<string, LucideIcon> = {
  meeting:    Video,
  task_block: CheckSquare,
  break:      Coffee,
  lunch:      Utensils,
  training:   GraduationCap,
  focus:      Target,
  other:      MoreHorizontal,
};
