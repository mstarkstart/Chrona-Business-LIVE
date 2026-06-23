"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { subscribeActivity, STATUS_COLOUR, STATUS_LABEL, STATUS_EMOJI } from "@/lib/realtime/presence";
import type { ActivityStatus } from "@/lib/supabase/types";

import { TimeAgo } from "@/components/ui/time-ago";

const STATUS_WEIGHT: Record<ActivityStatus, number> = {
  tasking: 10,
  meeting: 9,
  training: 8,
  available: 7,
  lunch_break: 5,
  personal_time: 4,
  offline: 1,
};

type Row = { workspace_member_id: string; user_name: string; status: ActivityStatus; avatar_url: string | null; task_title?: string | null; updated_at?: string | null; };

function Avatar({ row, size = 6 }: { row: Row; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const sizeClass = size === 6 ? "h-6 w-6" : "h-7 w-7";
  const textClass = size === 6 ? "text-[10px]" : "text-xs";
  const baseClasses = `${sizeClass} rounded-full object-cover shrink-0 border-2 border-white/70 shadow-[0_1px_4px_rgba(80,120,160,0.15)] hover:scale-[1.08] hover:z-10 active:scale-[0.95] transition-all duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative cursor-pointer`;

  return imgFailed || !row.avatar_url ? (
    <div
      className={`${baseClasses} bg-indigo-500/10 text-indigo-600 flex items-center justify-center ${textClass} font-bold`}
      title={`${row.user_name} (${STATUS_LABEL[row.status]})`}
    >
      {row.user_name.charAt(0).toUpperCase()}
    </div>
  ) : (
    <img
      src={row.avatar_url}
      alt={row.user_name}
      className={baseClasses}
      title={`${row.user_name} (${STATUS_LABEL[row.status]})`}
      onError={() => setImgFailed(true)}
    />
  );
}

export function LiveActivityList({
  businessId,
  initial,
  collapsed = false,
}: {
  businessId: string;
  initial: Row[];
  collapsed?: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeActivity(businessId, (change) => {
      setRows((prev) =>
        prev.map((r) =>
          r.workspace_member_id === change.workspace_member_id
            ? { ...r, status: change.status, updated_at: new Date().toISOString() }
            : r
        )
      );
    });
    return unsubscribe;
  }, [businessId]);

  const sorted = [...rows].sort((a, b) => STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status]);

  const filtered = search.trim()
    ? sorted.filter((r) => r.user_name.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  const MAX_VISIBLE = 6;
  const displayRows = (!showAll && !search && filtered.length > MAX_VISIBLE) 
    ? filtered.slice(0, MAX_VISIBLE) 
    : filtered;

  if (rows.length === 0) {
    if (collapsed) return null;
    return <li className="text-xs text-muted-foreground/50 italic py-2">No teammates online.</li>;
  }

  if (collapsed) {
    return (
      <>
        {displayRows.map((r) => (
          <li key={r.workspace_member_id} className="relative group flex justify-center py-2 cursor-pointer">
            <div className="relative">
              <Avatar row={r} size={6} />
              <span
                className="absolute -bottom-1 -right-1 flex items-center justify-center text-[9px] leading-none bg-white rounded-full p-[1.5px] shadow-sm ring-1 ring-black/5"
                title={STATUS_LABEL[r.status]}
              >
                {STATUS_EMOJI[r.status]}
              </span>
            </div>
            
            {/* Hover Tooltip for collapsed state */}
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 w-max max-w-[220px] bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none z-50 flex flex-col gap-1">
              <p className="font-bold">{r.user_name}</p>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-[10px]">{STATUS_EMOJI[r.status]}</span>
                <span className="capitalize">{STATUS_LABEL[r.status]}</span>
              </div>
              {r.status === "tasking" && r.task_title && (
                <p className="text-slate-400 text-[10px] truncate">📋 {r.task_title}</p>
              )}
              {r.status === "meeting" && (
                <p className="text-slate-400 text-[10px]">📅 In a meeting</p>
              )}
              {r.status === "training" && (
                <p className="text-slate-400 text-[10px]">📚 In training</p>
              )}
              {r.status === "lunch_break" && (
                <p className="text-slate-400 text-[10px]">🍽️ On lunch break</p>
              )}
              <p className="text-slate-400 text-[10px] mt-1 border-t border-slate-700 pt-1">
                ⏱️ for <TimeAgo dateString={r.updated_at} />
              </p>
              {/* Little triangle arrow pointing right */}
              <div className="absolute top-1/2 right-[-4px] -translate-y-1/2 border-[5px] border-transparent border-l-slate-900" />
            </div>
          </li>
        ))}
        {!search && filtered.length > MAX_VISIBLE && (
          <li className="mt-2 w-full flex justify-center">
            <button 
              onClick={() => setShowAll(!showAll)}
              className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 transition-colors flex items-center justify-center shadow-sm border border-slate-200"
              title={showAll ? "Show Less" : "Show All"}
            >
              {showAll ? "↑" : `+${filtered.length - MAX_VISIBLE}`}
            </button>
          </li>
        )}
      </>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Search */}
      <div className="relative my-2.5">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teammates…"
          className="w-full rounded-lg border border-border bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      <ul className="space-y-1">
        {filtered.length === 0 && search && (
          <li className="text-xs text-muted-foreground/60 italic py-2 px-1">No match for &quot;{search}&quot;</li>
        )}

        {displayRows.map((r) => (
          <li key={r.workspace_member_id} className="relative group flex items-center justify-between gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-all duration-150 cursor-pointer">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                {r.avatar_url ? (
                  <AvatarWithFallback row={r} />
                ) : (
                  <div className="h-6.5 w-6.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold">
                     {r.user_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  className="absolute -bottom-1 -right-1 flex items-center justify-center text-[10px] leading-none bg-white rounded-full p-[1.5px] shadow-sm ring-1 ring-black/5 z-20"
                  title={STATUS_LABEL[r.status]}
                >
                  {STATUS_EMOJI[r.status]}
                </span>
              </div>
              <div className="min-w-0">
                <span className="block truncate font-semibold text-[14px] text-[#1E2D3D] group-hover:text-primary transition-colors duration-150">
                  {r.user_name}
                </span>
                {r.status === "tasking" && r.task_title && (
                  <span className="block truncate text-[10px] text-[#40566E]">📋 {r.task_title}</span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className="text-[9px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1"
                style={{
                  color: STATUS_COLOUR[r.status],
                  background: STATUS_COLOUR[r.status] + "15",
                  borderColor: STATUS_COLOUR[r.status] + "25",
                }}
              >
                <span className="text-[10px]">{STATUS_EMOJI[r.status]}</span>
                {STATUS_LABEL[r.status]}
              </span>
              <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                ⏱️ <TimeAgo dateString={r.updated_at} />
              </span>
            </div>

          </li>
        ))}
      </ul>

      {!search && filtered.length > MAX_VISIBLE && (
        <button 
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-2 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          {showAll ? "Show Less" : `Show All (${filtered.length})`}
        </button>
      )}
    </div>
  );
}

function AvatarWithFallback({ row }: { row: Row }) {
  const [failed, setFailed] = useState(false);
  const baseClasses = `h-6.5 w-6.5 rounded-full object-cover shrink-0 border-2 border-white/70 shadow-[0_1px_4px_rgba(80,120,160,0.15)] hover:scale-[1.08] hover:z-10 active:scale-[0.95] transition-all duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative cursor-pointer`;
  
  if (failed || !row.avatar_url) {
    return (
      <div className={`${baseClasses} bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-[10px] font-bold`}>
        {row.user_name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={row.avatar_url}
      alt={row.user_name}
      className={baseClasses}
      onError={() => setFailed(true)}
    />
  );
}
