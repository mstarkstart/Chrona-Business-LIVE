"use client";

import { Plus, ClipboardCheck, Sparkles, FileBarChart, CalendarPlus, UserPlus, ShieldCheck, X } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { AIChatDrawer } from "@/components/shell/AIChatDrawer";

type ActionDef = {
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  href?: string;
  comingSoon?: boolean;
  color?: string;
};

const ACTIONS: Record<string, ActionDef> = {
  "task.create":     { label: "Create Task",            icon: ClipboardCheck, href: "/tasks?new=1",         color: "#6366f1" },
  "ai.chat":         { label: "Chrona Nexus",              icon: Sparkles,                                     color: "#a78bfa" },
  "report.generate": { label: "Workload Reports",       icon: FileBarChart,   comingSoon: true,             color: "#818cf8" },
  "calendar.new":    { label: "Schedule Event",         icon: CalendarPlus,   href: "/calendar",            color: "#34d399" },
  "member.invite":   { label: "Invite Teammate",        icon: UserPlus,       href: "/organisation/members",color: "#fb923c" },
  "approval.review": { label: "Review Approvals",       icon: ShieldCheck,    href: "/approvals",           color: "#fbbf24" },
};

export function MultiFunctionButton({ actions, workspaceId }: { actions: string[]; workspaceId?: string }) {
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [aiDrawerActive, setAiDrawerActive] = useState(false);
  
  // Upgrade defaults list in P1.9
  const items = actions.length > 0 ? actions : ["task.create", "ai.chat", "calendar.new", "member.invite", "report.generate"];

  useEffect(() => {
    const onOpen = () => setAiDrawerActive(true);
    const onClose = () => setAiDrawerActive(false);
    window.addEventListener("chrona-ai-open", onOpen);
    window.addEventListener("chrona-ai-close", onClose);
    return () => {
      window.removeEventListener("chrona-ai-open", onOpen);
      window.removeEventListener("chrona-ai-close", onClose);
    };
  }, []);

  function pick(action: string) {
    if (ACTIONS[action]?.comingSoon) {
      setOpen(false);
      setToast("Coming soon");
      setTimeout(() => setToast(null), 1800);
      return;
    }

    if (action === "ai.chat") {
      setOpen(false);
      setAiOpen(true);
    }
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]" onClick={() => setOpen(false)} />}

      {/* Hide the float button container when the AI drawer is open */}
      {!aiOpen && !aiDrawerActive && (
        <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          {/* Action items fan out */}
          {open && (
            <div className="flex flex-col items-end gap-2 mb-2">
              {items.map((key, i) => {
                const def = ACTIONS[key];
                if (!def) return null;
                const Icon = def.icon;
                const content = (
                  <div
                    className="flex items-center gap-3 rounded-2xl border border-border bg-white/95 px-4 py-3 shadow-2xl text-sm font-semibold text-foreground hover:bg-indigo-50/50 hover:text-indigo-600 transition-all animate-fade-up cursor-pointer backdrop-blur-md border-r-4"
                    style={{ animationDelay: `${i * 30}ms`, borderRightColor: def.color }}
                    onClick={() => pick(key)}
                  >
                    <div className="h-7 w-7 rounded-xl flex items-center justify-center" style={{ background: `${def.color}15` }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: def.color }} />
                    </div>
                    {def.label}
                    {def.comingSoon && (
                      <span className="ml-1 text-[10px] text-muted-foreground bg-slate-100 border border-border px-2 py-0.5 rounded-full font-bold">soon</span>
                    )}
                  </div>
                );
                return def.href && !def.comingSoon && key !== "ai.chat" ? (
                  <Link key={key} href={def.href} onClick={() => setOpen(false)}>{content}</Link>
                ) : (
                  <div key={key}>{content}</div>
                );
              })}
            </div>
          )}

          {/* Main FAB */}
          <button
            onClick={() => setOpen((o) => !o)}
            className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-xl transition-all active:scale-90 relative cursor-pointer ${
              open
                ? "bg-card border border-border text-foreground hover:bg-slate-100"
                : "bg-primary text-white border border-indigo-500/20 hover:brightness-105"
            }`}
          >
            {open ? <X className="h-5 w-5" /> : (
              <>
                <Plus className="h-5 w-5" />
                {/* Pulse notification dot for AI assistant */}
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-violet-500 border-2 border-white"></span>
                </span>
              </>
            )}
          </button>
        </div>
      )}

      <AIChatDrawer open={aiOpen} onClose={() => setAiOpen(false)} workspaceId={workspaceId} />

      {toast && (
        <div className="fixed top-20 right-4 z-50 rounded-xl border border-border bg-white/95 text-foreground px-4 py-2.5 text-xs font-semibold shadow-2xl backdrop-blur-md animate-fade-up">
          ✨ {toast}
        </div>
      )}
    </>
  );
}
