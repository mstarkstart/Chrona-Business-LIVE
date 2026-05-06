"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Sparkles, Clock, Radio, ChevronLeft, ChevronRight } from "lucide-react";
import { ActivityStatusPicker } from "./ActivityStatusPicker";
import { LiveActivityList } from "./LiveActivityList";
import type { ActivityStatus } from "@/lib/supabase/types";

export type SidebarBProps = {
  businessId: string;
  myMemberId: string;
  myStatus: ActivityStatus;
  myTasksToday: { id: string; title: string }[];
  suggestedTasks: { id: string; title: string }[];
  inProgressTasks: { id: string; title: string }[];
  initialPresence: { business_member_id: string; user_name: string; status: ActivityStatus }[];
  members: { id: string; name: string; userId: string }[];
};

export function SidebarB({
  businessId,
  myMemberId,
  myStatus,
  myTasksToday,
  suggestedTasks,
  inProgressTasks,
  initialPresence,
}: SidebarBProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("chrona-sidebar-b");
    if (saved === "collapsed") setCollapsed(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("chrona-sidebar-b", next ? "collapsed" : "open");
  }

  if (collapsed) {
    return (
      <aside className="hidden lg:relative lg:flex w-12 shrink-0 flex-col border-l border-border bg-card items-center py-4 gap-3">
        {/* Toggle on LEFT edge of this right sidebar */}
        <button
          onClick={toggle}
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full border border-border bg-white shadow-md flex items-center justify-center hover:bg-accent"
          title="Expand"
        >
          <ChevronLeft className="h-3 w-3 text-muted-foreground" />
        </button>
        <div
          className="h-2.5 w-2.5 rounded-full mt-2"
          style={{
            background:
              myStatus === "available" ? "#10b981"
              : myStatus === "tasking" ? "#eab308"
              : "#6b7280",
          }}
        />
      </aside>
    );
  }

  return (
    <aside className="hidden lg:relative lg:flex w-72 shrink-0 flex-col border-l border-border bg-card overflow-y-auto">
      {/* Toggle on LEFT edge */}
      <button
        onClick={toggle}
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full border border-border bg-white shadow-md flex items-center justify-center hover:bg-accent"
        title="Collapse"
      >
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
      </button>

      {/* My Status */}
      <div className="p-4 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">My status</p>
        <ActivityStatusPicker businessMemberId={myMemberId} initial={myStatus} />
      </div>

      <Section icon={<Clock className="h-3.5 w-3.5" />} title="In progress">
        {inProgressTasks.length === 0
          ? <Empty>No active work right now.</Empty>
          : inProgressTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="truncate">{t.title}</span>
              </li>
            ))}
      </Section>

      <Section icon={<CheckCircle2 className="h-3.5 w-3.5" />} title="Today's tasks">
        {myTasksToday.length === 0
          ? <Empty>Nothing scheduled today.</Empty>
          : myTasksToday.map((t) => (
              <li key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                <div className="h-3.5 w-3.5 rounded border border-border shrink-0" />
                <span className="truncate text-muted-foreground">{t.title}</span>
              </li>
            ))}
      </Section>

      <Section icon={<Sparkles className="h-3.5 w-3.5" />} title="Suggested">
        {suggestedTasks.length === 0
          ? <Empty>All tasks are assigned.</Empty>
          : suggestedTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                <Sparkles className="h-3 w-3 text-indigo-400 shrink-0" />
                <span className="truncate text-muted-foreground">{t.title}</span>
              </li>
            ))}
      </Section>

      <Section icon={<Radio className="h-3.5 w-3.5" />} title="Team now">
        <LiveActivityList businessId={businessId} initial={initialPresence} />
      </Section>
    </aside>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-muted-foreground">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <li className="text-xs text-muted-foreground/60 italic py-1">{children}</li>;
}
