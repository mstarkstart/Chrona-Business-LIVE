"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Sparkles, Building2 } from "lucide-react";
import { NotificationBell } from "@/components/shell/NotificationBell";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { AIChatDrawer } from "@/components/shell/AIChatDrawer";
import type { Tables } from "@/lib/supabase/types";

interface TopbarProps {
  userId: string;
  initialNotifications: Tables<"notifications">[];
  workspaceId: string;
  workspaceName?: string;
  // kept for layout compat, not rendered
  userName?: string;
  avatarUrl?: string | null;
}

export function Topbar({
  userId,
  initialNotifications,
  workspaceId,
  workspaceName = "Chrona Workspace",
}: TopbarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPulse, setAiPulse] = useState(true);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function openAI() {
    setAiPulse(false);
    setAiOpen(true);
  }

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b border-border bg-background/80 backdrop-blur-md gap-3 text-foreground">

        {/* Left: workspace name */}
        <div className="flex items-center gap-2 w-auto min-w-0 shrink-0">
          <span
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-600 truncate max-w-[200px]"
            title={workspaceName}
          >
            <Building2 className="h-3.5 w-3.5" />
            {workspaceName}
          </span>
        </div>

        {/* Center: search */}
        <button
          onClick={openPalette}
          aria-label="Open command palette"
          className="flex flex-1 max-w-sm items-center gap-2 rounded-xl border border-border bg-slate-50 px-3.5 py-1.5 text-xs text-muted-foreground shadow-sm hover:bg-slate-100 hover:text-foreground transition-all cursor-pointer"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded border border-border bg-slate-100 px-1 py-0.5 text-[9px] font-mono leading-none text-muted-foreground shrink-0">
            ⌘K
          </kbd>
        </button>

        {/* Right: AI + bell */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={openAI}
            title="AI Assistant"
            className="relative h-8 w-8 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center hover:bg-violet-100/50 transition-all cursor-pointer active:scale-90"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {aiPulse && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500 border border-white" />
              </span>
            )}
          </button>

          <NotificationBell userId={userId} initial={initialNotifications} />
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={closePalette} workspaceId={workspaceId} />
      <AIChatDrawer open={aiOpen} onClose={() => setAiOpen(false)} workspaceId={workspaceId} />
    </>
  );
}
