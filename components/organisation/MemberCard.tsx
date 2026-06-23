"use client";

import NextLink from "next/link";
import { ChevronRight, Briefcase, Layers, Mail } from "lucide-react";

interface MemberCardProps {
  id: string;
  name: string;
  email?: string;
  role: string;
  position?: string | null;
  status: string; // active, suspended, etc.
  presenceStatus?: string; // available, tasking, etc.
  departmentName?: string;
  teamName?: string;
  avatarUrl?: string | null;
}

export function MemberCard({
  id,
  name,
  email,
  role,
  position,
  status,
  presenceStatus = "offline",
  departmentName,
  teamName,
  avatarUrl,
}: MemberCardProps) {
  // Role label and badge styling
  const roleStyles: Record<string, { label: string; badge: string }> = {
    owner: {
      label: "Owner",
      badge: "bg-amber-50 text-amber-700 border border-amber-200/50",
    },
    admin: {
      label: "Admin",
      badge: "bg-sky-50 text-sky-700 border border-sky-200/50",
    },
    manager: {
      label: "Manager",
      badge: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
    },
    member: {
      label: "Member",
      badge: "bg-slate-55 text-slate-700 border border-slate-200/50",
    },
    guest: {
      label: "Guest",
      badge: "bg-purple-50 text-purple-700 border border-purple-200/50",
    },
  };

  const { label: roleLabel, badge: roleBadge } = roleStyles[role.toLowerCase()] || {
    label: role,
    badge: "bg-slate-100 text-slate-750 border border-slate-200",
  };

  // Status dot & glow mapping
  const presenceStyles: Record<string, { dotBg: string; text: string; glow: string }> = {
    available: { dotBg: "bg-emerald-500", text: "text-emerald-600", glow: "shadow-[0_0_6px_rgba(16,185,129,0.4)] animate-pulse-soft" },
    tasking: { dotBg: "bg-amber-500", text: "text-amber-600", glow: "shadow-[0_0_6px_rgba(245,158,11,0.4)] animate-pulse" },
    meeting: { dotBg: "bg-violet-500", text: "text-violet-600", glow: "shadow-[0_0_6px_rgba(139,92,246,0.2)]" },
    lunch_break: { dotBg: "bg-sky-500", text: "text-sky-600", glow: "shadow-[0_0_6px_rgba(14,165,233,0.2)]" },
    personal_time: { dotBg: "bg-sky-400", text: "text-sky-500", glow: "shadow-[0_0_6px_rgba(56,189,248,0.2)]" },
    training: { dotBg: "bg-pink-500", text: "text-pink-600", glow: "shadow-[0_0_6px_rgba(236,72,153,0.2)]" },
    offline: { dotBg: "bg-zinc-400", text: "text-muted-foreground", glow: "shadow-none" },
  };

  const currentPresence = presenceStyles[presenceStatus.toLowerCase()] || presenceStyles.offline;

  return (
    <NextLink
      href={`/organisation/members/${id}`}
      className="group flex items-center justify-between rounded-xl border border-slate-150 bg-card/70 backdrop-blur-sm py-2.5 px-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50/60 hover:border-slate-300 hover:shadow-sm relative"
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        {/* Avatar with dynamic presence ring */}
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="h-8.5 w-8.5 rounded-full object-cover ring-1 ring-slate-100"
            />
          ) : (
            <div className="h-8.5 w-8.5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-muted-foreground border border-slate-200 select-none">
              {name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
          )}
          
          {/* Glowing Status Indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-background flex items-center justify-center">
            <span className={`h-1.5 w-1.5 rounded-full ${currentPresence.dotBg} ${currentPresence.glow}`} />
          </div>
        </div>

        {/* Member Details in a single row or compact layout */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-x-6 gap-y-0.5 flex-1 min-w-0">
          {/* Name & Role */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm truncate">
              {name}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${roleBadge} tracking-wide shrink-0`}>
              {roleLabel}
            </span>
            {status === "suspended" && (
              <span className="text-[9px] font-bold bg-red-50 text-red-700 border border-red-250 px-1.5 py-0.5 rounded-md animate-pulse-soft shrink-0">
                SUSPENDED
              </span>
            )}
          </div>

          {/* Position & Team info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground truncate">
            {position && (
              <span className="flex items-center gap-1 shrink-0 max-w-[140px] truncate">
                <Briefcase className="h-3 w-3 text-muted-foreground/50" />
                {position}
              </span>
            )}
            {departmentName && (
              <span className="flex items-center gap-1 truncate max-w-[180px]">
                <Layers className="h-3 w-3 text-muted-foreground/50" />
                <span className="truncate">{departmentName}</span>
                {teamName && <span className="text-muted-foreground/30 font-light">/ {teamName}</span>}
              </span>
            )}
          </div>

          {/* Email (hidden on small, shown on large) */}
          {email && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground/80 hidden lg:flex shrink-0 w-[180px] truncate">
              <Mail className="h-3 w-3 text-muted-foreground/40" />
              {email}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-3">
        <div className="text-right hidden sm:block">
          <span className={`text-[9px] font-semibold tracking-wider uppercase ${currentPresence.text}`}>
            {presenceStatus.replace("_", " ")}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      </div>
    </NextLink>
  );
}
