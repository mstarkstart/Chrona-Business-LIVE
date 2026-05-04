"use client";

import { Plus, ClipboardCheck, Sparkles, FileBarChart, CalendarPlus, UserPlus, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

type ActionDef = {
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  href?: string;
  comingSoon?: boolean;
  color?: string;
};

const ACTIONS: Record<string, ActionDef> = {
  "task.create":     { label: "Create task",         icon: ClipboardCheck, href: "/tasks?new=1",              color: "#7c6af7" },
  "ai.chat":         { label: "AI assistant",        icon: Sparkles,       comingSoon: true,                   color: "#a78bfa" },
  "report.generate": { label: "Generate report",     icon: FileBarChart,   comingSoon: true,                   color: "#6366f1" },
  "calendar.new":    { label: "New calendar event",  icon: CalendarPlus,   href: "/calendar",                  color: "#22c55e" },
  "member.invite":   { label: "Invite member",       icon: UserPlus,       href: "/organisation/members",      color: "#f97316" },
  "approval.review": { label: "Review approvals",    icon: ShieldCheck,    href: "/approvals",                 color: "#eab308" },
};

export function MultiFunctionButton({ actions }: { actions: string[] }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const items = actions.length > 0 ? actions : ["task.create", "ai.chat", "report.generate"];

  function pick(action: string) {
    if (ACTIONS[action]?.comingSoon) {
      setOpen(false);
      setToast("Coming soon");
      setTimeout(() => setToast(null), 1800);
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {/* FAB */}
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-3">

        {/* Action items */}
        {open && (
          <div className="flex flex-col items-end gap-2 mb-2">
            {items.map((key, i) => {
              const def = ACTIONS[key];
              if (!def) return null;
              const Icon = def.icon;
              const content = (
                <div
                  className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-lg shadow-gray-200 text-sm font-medium hover:bg-accent transition-all animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => pick(key)}
                >
                  <div className="h-7 w-7 rounded-xl flex items-center justify-center" style={{ background: `${def.color}22` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: def.color }} />
                  </div>
                  {def.label}
                  {def.comingSoon && (
                    <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">soon</span>
                  )}
                </div>
              );
              return def.href && !def.comingSoon ? (
                <Link key={key} href={def.href} onClick={() => setOpen(false)}>{content}</Link>
              ) : (
                <div key={key} className="cursor-pointer">{content}</div>
              );
            })}
          </div>
        )}

        {/* Main button */}
        <button
          onClick={() => setOpen((o) => !o)}
          className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-xl shadow-black/40 transition-all active:scale-95 ${
            open
              ? "bg-card border border-border rotate-45"
              : "bg-primary glow-primary hover:brightness-110"
          }`}
        >
          {open
            ? <X className="h-5 w-5" />
            : <Plus className="h-5 w-5 text-white" />
          }
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium shadow-lg shadow-gray-200 animate-fade-up">
          ✨ {toast}
        </div>
      )}
    </>
  );
}
