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

  useEffect(() => {
    const topbar = document.getElementById("main-topbar");
    const handler = () => {
      if (topbar) {
        topbar.classList.toggle('topbar-scrolled', window.scrollY > 10);
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <div id="main-topbar" className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-[rgba(235,244,252,0.60)] backdrop-blur-[20px] border-b border-[rgba(200,220,235,0.35)] shadow-[inset_0_-1px_0_rgba(255,255,255,0.55)] gap-3 text-foreground transition-all duration-200">

        {/* Left: workspace name */}
        <div className="flex items-center gap-2 w-auto min-w-0 shrink-0">
          <span
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-white/45 border border-white/60 text-[#1E2D3D] text-[13px] font-medium hover:bg-white/62 active:scale-[0.96] transition-all duration-140 btn-press truncate max-w-[200px]"
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
          className="flex flex-1 max-w-sm items-center gap-2 bg-white/40 backdrop-blur-[12px] border border-white/55 rounded-[20px] text-[#1E2D3D] text-[13px] px-4 py-2 hover:bg-white/68 hover:border-[rgba(74,144,212,0.45)] hover:shadow-[0_0_0_3px_rgba(74,144,212,0.12)] transition-all duration-200 cursor-pointer btn-press"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-[#465C73]" />
          <span className="flex-1 text-left text-[#465C73]">Search…</span>
          <kbd className="rounded px-1 py-0.5 text-[9px] font-mono leading-none text-[#465C73] shrink-0 font-medium">
            ⌘K
          </kbd>
        </button>

        {/* Right: AI + bell */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={openAI}
            title="AI Assistant"
            className="p-1.5 rounded-[8px] hover:bg-white/45 active:scale-[0.88] active:bg-white/58 transition-all duration-130 ease-[cubic-bezier(0.34,1.56,0.64,1)] btn-press relative cursor-pointer"
          >
            <img
              src="/nexus-logo.png"
              alt="AI Assistant"
              className="h-5.5 w-5.5 object-contain"
            />
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
