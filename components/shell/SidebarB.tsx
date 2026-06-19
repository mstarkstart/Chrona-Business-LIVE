"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { ActivityStatusPicker } from "./ActivityStatusPicker";
import { LiveActivityList } from "./LiveActivityList";
import { StatusPickerPopover } from "./StatusPickerPopover";
import { STATUS_COLOUR, STATUS_LABEL } from "@/lib/realtime/presence";
import type { ActivityStatus } from "@/lib/supabase/types";
import { supabase } from "@/lib/supabase/client";
import { TimeAgo } from "@/components/ui/time-ago";

export type SidebarBProps = {
  businessId: string;
  myMemberId: string;
  myStatus: ActivityStatus;
  myStatusUpdatedAt?: string | null;
  myTasksToday: { id: string; title: string }[];
  suggestedTasks: { id: string; title: string }[];
  inProgressTasks: { id: string; title: string }[];
  initialPresence: { workspace_member_id: string; user_name: string; status: ActivityStatus; updated_at?: string; avatar_url: string | null; task_title?: string | null }[];
  members: { id: string; name: string; userId: string }[];
  avatarUrl?: string | null;
  userName?: string;
};

export function SidebarB({
  businessId,
  myMemberId,
  myStatus,
  myStatusUpdatedAt,
  myTasksToday,
  suggestedTasks,
  inProgressTasks,
  initialPresence,
  avatarUrl,
  userName = "Me",
}: SidebarBProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [statusHover, setStatusHover] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentStatus, setCurrentStatus] = useState<ActivityStatus>(myStatus);
  const [currentStatusUpdatedAt, setCurrentStatusUpdatedAt] = useState<string | null | undefined>(myStatusUpdatedAt);

  useEffect(() => {
    setCurrentStatus(myStatus);
    setCurrentStatusUpdatedAt(myStatusUpdatedAt);
  }, [myStatus, myStatusUpdatedAt]);

  useEffect(() => {
    if (!myMemberId) return;
    const channel = supabase
      .channel(`self-presence-sync-b:${myMemberId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_status",
          filter: `workspace_member_id=eq.${myMemberId}`,
        },
        (payload) => {
          const updated = payload.new as { status: ActivityStatus, updated_at?: string } | undefined;
          if (updated) {
            setCurrentStatus(updated.status);
            if (updated.updated_at) setCurrentStatusUpdatedAt(updated.updated_at);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [myMemberId]);

  useEffect(() => {
    const saved = localStorage.getItem("chrona-sidebar-b");
    if (saved === "collapsed") setCollapsed(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("chrona-sidebar-b", next ? "collapsed" : "open");
  }

  // Hover handlers for collapsed mode
  function handleAvatarMouseEnter() {
    if (!collapsed) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setStatusHover(true), 300);
  }
  function handleAvatarMouseLeave() {
    if (!collapsed) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setStatusHover(false), 120);
  }
  function handlePopoverMouseEnter() {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setStatusHover(true);
  }
  function handlePopoverMouseLeave() {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setStatusHover(false), 120);
  }

  const statusColor = STATUS_COLOUR[currentStatus];

  return (
    <aside
      className={`hidden lg:relative lg:flex shrink-0 h-full border-l border-border bg-card transition-[width] duration-300 ease-in-out relative ${
        collapsed ? "w-14" : "w-72"
      }`}
    >
      {/* ── Collapsed Content ── */}
      <div
        className={`absolute inset-0 w-14 py-4 flex flex-col items-center gap-4 px-2 transition-opacity duration-200 ${
          collapsed ? "opacity-100 delay-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* StatusPickerPopover — hover or click triggered when collapsed */}
        {statusHover && (
          <div
            className="absolute top-0 left-0"
            onMouseEnter={handlePopoverMouseEnter}
            onMouseLeave={handlePopoverMouseLeave}
          >
            <StatusPickerPopover
              initial={currentStatus}
              updatedAt={currentStatusUpdatedAt}
              avatarUrl={avatarUrl}
              userName={userName}
              anchorTop={80}
              align="right"
              onClose={() => setStatusHover(false)}
            />
          </div>
        )}

        <button
          onClick={toggle}
          className="h-8 w-8 rounded-xl border border-border bg-card text-foreground hover:bg-accent shadow-sm flex items-center justify-center cursor-pointer transition-all active:scale-90"
          title="Expand Sidebar"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="w-8 border-t border-border" />

        {/* Collapsed: avatar with status glow ring */}
        <div
          className="relative flex justify-center cursor-pointer"
          onClick={() => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            setStatusHover((h) => !h);
          }}
          onMouseEnter={handleAvatarMouseEnter}
          onMouseLeave={handleAvatarMouseLeave}
        >
          {/* Glow ring */}
          <span
            className="absolute inset-[-3px] rounded-full status-spark pointer-events-none"
            style={{
              border: `2px solid ${statusColor}`,
              ["--spark-color" as string]: statusColor,
            }}
          />
          <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center relative z-10">
            {avatarUrl
              ? <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
              : <User className="h-4 w-4 text-white" />}
          </div>
        </div>

        {/* Collapsed team status circles */}
        <ul className="flex flex-col items-center w-full">
          <LiveActivityList
            businessId={businessId}
            initial={initialPresence}
            collapsed={true}
          />
        </ul>
      </div>

      {/* ── Expanded Content ── */}
      <div
        className={`absolute inset-0 w-72 overflow-y-auto overflow-x-hidden flex flex-col transition-opacity duration-200 ${
          collapsed ? "opacity-0 pointer-events-none" : "opacity-100 delay-100"
        }`}
      >
        {/* ── My Status ── */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My status</p>
            <button
              onClick={toggle}
              className="h-7 w-7 rounded-lg border border-border bg-card text-foreground hover:bg-accent flex items-center justify-center cursor-pointer transition-all active:scale-90"
              title="Collapse Sidebar"
            >
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Avatar with glowing status ring */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="relative">
              {/* Outer animated glow ring */}
              <span
                className="absolute inset-[-4px] rounded-full status-spark pointer-events-none"
                style={{
                  border: `2.5px solid ${statusColor}`,
                  ["--spark-color" as string]: statusColor,
                  boxShadow: `0 0 12px 3px ${statusColor}55`,
                }}
              />
              {/* Avatar */}
              <div className="h-14 w-14 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center relative z-10 shadow-md">
                {avatarUrl
                  ? <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
                  : <User className="h-7 w-7 text-white" />}
              </div>
              {/* Status dot bottom-right */}
              <span
                className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card z-20 status-spark"
                style={{
                  background: statusColor,
                  ["--spark-color" as string]: statusColor,
                }}
              />
            </div>

            {/* Name + current status label */}
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">{userName}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: statusColor }}>
                {STATUS_LABEL[currentStatus]}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                ⏱️ for <TimeAgo dateString={currentStatusUpdatedAt} />
              </p>
            </div>
          </div>

          {/* Status picker dropdown */}
          <ActivityStatusPicker businessMemberId={myMemberId} initial={currentStatus} updatedAt={currentStatusUpdatedAt} />
        </div>

        <Section icon={<span className="text-base select-none">🕒</span>} title="In progress">
          {inProgressTasks.length === 0 ? (
            <Empty>No active work right now.</Empty>
          ) : (
            inProgressTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 py-1.5 text-sm text-foreground hover:text-primary transition-all duration-200 cursor-pointer">
                <div
                  className="h-2 w-2 rounded-full shrink-0 status-spark relative"
                  style={{ background: "#fb923c", ["--spark-color" as string]: "#fb923c" }}
                >
                  <div className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-30" />
                </div>
                <span className="truncate">{t.title}</span>
              </li>
            ))
          )}
        </Section>

        <Section icon={<span className="text-base select-none">✅</span>} title="Today's tasks">
          {myTasksToday.length === 0 ? (
            <Empty>Nothing scheduled today.</Empty>
          ) : (
            myTasksToday.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 py-1.5 text-sm text-foreground hover:text-primary transition-all duration-200 cursor-pointer">
                <div className="h-3.5 w-3.5 rounded border border-border shrink-0 bg-muted" />
                <span className="truncate text-muted-foreground">{t.title}</span>
              </li>
            ))
          )}
        </Section>

        <Section icon={<span className="text-base select-none">✨</span>} title="Suggested">
          {suggestedTasks.length === 0 ? (
            <Empty>All tasks are assigned.</Empty>
          ) : (
            suggestedTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 py-1.5 text-sm text-foreground hover:text-primary transition-all duration-200 cursor-pointer">
                <span className="text-xs shrink-0 select-none">✨</span>
                <span className="truncate text-muted-foreground">{t.title}</span>
              </li>
            ))
          )}
        </Section>

        <Section icon={<span className="text-base select-none animate-pulse-soft">📡</span>} title="Team now">
          <LiveActivityList businessId={businessId} initial={initialPresence} />
        </Section>
      </div>
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
  return <li className="text-xs text-muted-foreground/50 italic py-1">{children}</li>;
}
