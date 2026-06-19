"use client";

import Link from "lucide-react";
import NextLink from "next/link";
import { ChevronRight, Shield, Layers, Briefcase, Mail } from "lucide-react";

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
      label: "👑 Owner",
      badge: "bg-amber-50 text-amber-700 border border-amber-250 shadow-[0_1px_3px_rgba(245,158,11,0.05)]",
    },
    admin: {
      label: "🛡️ Admin",
      badge: "bg-sky-50 text-sky-700 border border-sky-250 shadow-[0_1px_3px_rgba(14,165,233,0.05)]",
    },
    manager: {
      label: "💼 Manager",
      badge: "bg-emerald-50 text-emerald-700 border border-emerald-250 shadow-[0_1px_3px_rgba(16,185,129,0.05)]",
    },
    member: {
      label: "👤 Member",
      badge: "bg-slate-100 text-slate-700 border border-slate-200",
    },
    guest: {
      label: "👥 Guest",
      badge: "bg-purple-50 text-purple-700 border border-purple-250",
    },
  };

  const { label: roleLabel, badge: roleBadge } = roleStyles[role.toLowerCase()] || {
    label: role,
    badge: "bg-slate-100 text-slate-700 border border-slate-200",
  };

  // Status dot & glow mapping
  const presenceStyles: Record<string, { dotBg: string; text: string; glow: string }> = {
    available: { dotBg: "bg-emerald-500", text: "text-emerald-700", glow: "shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse-soft" },
    tasking: { dotBg: "bg-amber-500", text: "text-amber-700", glow: "shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" },
    meeting: { dotBg: "bg-violet-500", text: "text-violet-700", glow: "shadow-[0_0_8px_rgba(139,92,246,0.3)]" },
    lunch_break: { dotBg: "bg-sky-500", text: "text-sky-700", glow: "shadow-[0_0_8px_rgba(14,165,233,0.3)]" },
    personal_time: { dotBg: "bg-sky-400", text: "text-sky-600", glow: "shadow-[0_0_8px_rgba(56,189,248,0.3)]" },
    training: { dotBg: "bg-pink-500", text: "text-pink-700", glow: "shadow-[0_0_8px_rgba(236,72,153,0.3)]" },
    offline: { dotBg: "bg-zinc-400", text: "text-muted-foreground", glow: "shadow-none" },
  };

  const currentPresence = presenceStyles[presenceStatus.toLowerCase()] || presenceStyles.offline;

  return (
    <NextLink
      href={`/organisation/members/${id}`}
      className="group flex flex-col md:flex-row md:items-center justify-between rounded-xl border border-slate-200 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50/50 hover:border-slate-350 hover:shadow-md relative"
    >
      <div className="flex items-center gap-4">
        {/* Avatar with dynamic presence ring */}
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="h-11 w-11 rounded-full object-cover ring-2 ring-slate-100"
            />
          ) : (
            <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-muted-foreground border border-slate-200 select-none">
              {name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
          )}
          
          {/* Glowing Status Indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-background flex items-center justify-center">
            <span className={`h-2 w-2 rounded-full ${currentPresence.dotBg} ${currentPresence.glow}`} />
          </div>
        </div>

        {/* Member Details */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
              {name}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleBadge}`}>
              {roleLabel}
            </span>
            {status === "suspended" && (
              <span className="text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full animate-pulse-soft">
                SUSPENDED
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {position && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground/60" />
                {position}
              </span>
            )}
            {departmentName && (
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-muted-foreground/60" />
                {departmentName}
                {teamName && <span className="text-muted-foreground/40">/ {teamName}</span>}
              </span>
            )}
            {email && (
              <span className="flex items-center gap-1 hidden md:flex">
                <Mail className="h-3.5 w-3.5 text-muted-foreground/60" />
                {email}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 md:mt-0 justify-between md:justify-end">
        <div className="text-right md:block">
          <span className={`text-[10px] font-medium tracking-wider uppercase ${currentPresence.text}`}>
            {presenceStatus.replace("_", " ")}
          </span>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      </div>
    </NextLink>
  );
}
