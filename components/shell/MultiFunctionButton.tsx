"use client";

import { Plus, ClipboardCheck, Sparkles, FileBarChart, CalendarPlus, UserPlus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

type ActionDef = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  comingSoon?: boolean;
};

const ACTIONS: Record<string, ActionDef> = {
  "task.create":     { label: "Create / approve task",   icon: ClipboardCheck, href: "/tasks?new=1" },
  "ai.chat":         { label: "Talk to AI assistant",    icon: Sparkles,       comingSoon: true },
  "report.generate": { label: "Generate report",         icon: FileBarChart,   comingSoon: true },
  "calendar.new":    { label: "Create calendar event",   icon: CalendarPlus,   href: "/calendar" },
  "member.invite":   { label: "Invite a member",         icon: UserPlus,       href: "/organisation/members" },
  "approval.review": { label: "Review approvals",        icon: ShieldCheck,    href: "/approvals" },
};

export function MultiFunctionButton({ actions }: { actions: string[] }) {
  const [toast, setToast] = useState<string | null>(null);
  const items = actions.length > 0 ? actions : ["task.create", "ai.chat", "report.generate"];

  function pick(action: string) {
    if (ACTIONS[action]?.comingSoon) {
      setToast("Coming soon");
      setTimeout(() => setToast(null), 1500);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="fixed top-4 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-indigo-500"
          title="Quick actions"
        >
          <Plus className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {items.map((key) => {
            const def = ACTIONS[key];
            if (!def) return null;
            const Icon = def.icon;
            if (def.href && !def.comingSoon) {
              return (
                <DropdownMenuItem key={key} asChild>
                  <Link href={def.href} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" /> {def.label}
                  </Link>
                </DropdownMenuItem>
              );
            }
            return (
              <DropdownMenuItem key={key} onSelect={() => pick(key)}>
                <Icon className="h-4 w-4" /> {def.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {toast && (
        <div className="fixed top-16 right-4 z-50 rounded-lg bg-foreground text-background px-3 py-2 text-sm shadow">
          {toast}
        </div>
      )}
    </>
  );
}
