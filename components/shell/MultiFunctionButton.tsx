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

const NexusLogoIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <img
    src="/nexus-logo.png"
    alt="Chrona Nexus"
    className={className}
    style={{ ...style, objectFit: "contain" }}
  />
);

const ACTIONS: Record<string, ActionDef> = {
  "task.create":     { label: "Create Task",            icon: ClipboardCheck, href: "/tasks?new=1",         color: "#6366f1" },
  "ai.chat":         { label: "Chrona Nexus",           icon: NexusLogoIcon,                                color: "#a78bfa" },
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
                    className="flex items-center gap-3 rounded-[14px] bg-[rgba(255,255,255,0.60)] backdrop-blur-[20px] border border-white/70 border-r-[3px] px-4 py-3 shadow-[0_3px_16px_rgba(80,120,160,0.14),inset_0_1px_0_rgba(255,255,255,0.85)] text-[14px] font-semibold text-[#1E2D3D] hover:bg-white/78 hover:border-white/88 hover:-translate-y-[1px] active:scale-[0.96] transition-all duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] btn-press cursor-pointer"
                    style={{ animation: `glass-appear 280ms cubic-bezier(0.22,1,0.36,1) ${i * 50}ms both`, borderRightColor: def.color }}
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
            className={`h-12 w-12 rounded-full flex items-center justify-center btn-press shadow-[0_6px_20px_rgba(80,120,160,0.22),inset_0_1px_0_rgba(255,255,255,0.85)] hover:scale-[1.07] hover:shadow-[0_8px_26px_rgba(80,120,160,0.30)] active:scale-[0.93] transition-all duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative cursor-pointer ${
              open
                ? "bg-[rgba(255,255,255,0.80)] border-white/88 text-[#4A90D4] scale-[1.04]"
                : "bg-[rgba(255,255,255,0.55)] backdrop-blur-[16px] border border-white/72 text-[#1E2D3D] hover:bg-white/72"
            }`}
          >
            {open ? <X className="h-5 w-5" style={{ transition: 'transform 220ms cubic-bezier(0.34,1.56,0.64,1)', transform: 'rotate(45deg)' }} /> : (
              <>
                <Plus className="h-5 w-5" style={{ transition: 'transform 220ms cubic-bezier(0.34,1.56,0.64,1)', transform: 'rotate(0deg)' }} />
                {/* Pulse notification dot for AI assistant */}
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E85050] shadow-[0_0_8px_rgba(232,80,80,0.55)] animate-[badge-pulse_2s_ease-in-out_infinite]" />
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
