"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, User, Clock, CalendarCheck, Sparkles, Radio } from "lucide-react";
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
      className={`hidden lg:relative lg:flex shrink-0 h-full border-l border-[rgba(200,220,235,0.40)] bg-[rgba(240,246,252,0.68)] backdrop-blur-[24px] transition-[width] duration-300 ease-in-out relative ${
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
              onOptimisticUpdate={setCurrentStatus}
            />
          </div>
        )}

        <button
          onClick={toggle}
          className="h-8 w-8 rounded-[10px] bg-white/50 border border-white/65 text-[#344B63] hover:bg-white/72 hover:text-[#1E2D3D] shadow-[0_1px_5px_rgba(100,140,180,0.10),inset_0_1px_0_rgba(255,255,255,0.85)] flex items-center justify-center active:scale-[0.88] transition-all duration-130 ease-[cubic-bezier(0.34,1.56,0.64,1)] btn-press"
          title="Expand Sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="w-8 border-t border-[rgba(180,205,225,0.40)]" />

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
          <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center relative z-10 border-2 border-white/70 shadow-[0_1px_4px_rgba(80,120,160,0.15)] hover:scale-[1.08] hover:z-10 active:scale-[0.95] transition-all duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
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
        <div className="p-4 border-b border-[rgba(200,220,235,0.40)]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.09em] text-[#40566E]">My status</p>
            <button
              onClick={toggle}
              className="h-8 w-8 rounded-[10px] bg-white/50 border border-white/65 text-[#344B63] hover:bg-white/72 hover:text-[#1E2D3D] shadow-[0_1px_5px_rgba(100,140,180,0.10),inset_0_1px_0_rgba(255,255,255,0.85)] flex items-center justify-center active:scale-[0.88] transition-all duration-130 ease-[cubic-bezier(0.34,1.56,0.64,1)] btn-press"
              title="Collapse Sidebar"
            >
              <ChevronRight className="h-4 w-4" />
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
              <div className="h-14 w-14 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center relative z-10 border-2 border-white/70 shadow-[0_1px_4px_rgba(80,120,160,0.15)] hover:scale-[1.08] hover:z-10 active:scale-[0.95] transition-all duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
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
              <p className="text-[14px] font-semibold text-[#1E2D3D]">{userName}</p>
              <p className="text-[12px] font-medium mt-0.5" style={{ color: statusColor }}>
                {STATUS_LABEL[currentStatus]}
              </p>
              <p className="text-[10px] text-[#40566E] mt-0.5">
                ⏱️ for <TimeAgo dateString={currentStatusUpdatedAt} />
              </p>
            </div>
          </div>

          {/* Status picker dropdown */}
          <ActivityStatusPicker businessMemberId={myMemberId} initial={currentStatus} updatedAt={currentStatusUpdatedAt} onOptimisticUpdate={setCurrentStatus} />
        </div>

        <Section icon={<Clock className="h-[15px] w-[15px] text-[#40566E]" />} title="In progress">
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

        <Section icon={<CalendarCheck className="h-[15px] w-[15px] text-emerald-600" />} title="Today's tasks">
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

        <Section icon={<Sparkles className="h-[15px] w-[15px] text-amber-500" />} title="Suggested">
          {suggestedTasks.length === 0 ? (
            <Empty>All tasks are assigned.</Empty>
          ) : (
            suggestedTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 py-1.5 text-sm text-foreground hover:text-primary transition-all duration-200 cursor-pointer">
                <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                <span className="truncate text-muted-foreground">{t.title}</span>
              </li>
            ))
          )}
        </Section>

        <Section icon={<Radio className="h-[15px] w-[15px] animate-pulse text-indigo-500" />} title="Team now">
          <LiveActivityList businessId={businessId} initial={initialPresence} />
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="m-3 p-3 bg-white/35 backdrop-blur-[12px] rounded-[12px] border border-white/55 shadow-[0_1px_8px_rgba(100,140,180,0.08),inset_0_1px_0_rgba(255,255,255,0.75)]">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[#40566E]">{icon}</span>
        <p className="text-[10px] font-medium uppercase tracking-[0.09em] text-[#40566E]">{title}</p>
      </div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <li className="text-xs text-muted-foreground/50 italic py-1">{children}</li>;
}
