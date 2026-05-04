"use client";

import { useState } from "react";
import { Crown, ShieldHalf, Users, Star, User } from "lucide-react";

const ROLES = [
  {
    key: "employer",
    icon: Crown,
    label: "Employer",
    color: "#4f46e5",
    sees: ["Company-wide progress", "Every department & team", "All employees & approvals"],
    description: "Total visibility. Founders and partners see everything.",
  },
  {
    key: "csuite",
    icon: ShieldHalf,
    label: "C-Suite",
    color: "#6366f1",
    sees: ["Cross-department progress", "Direct reports performance", "Strategic dashboards"],
    description: "CEOs, CTOs, COOs. Full visibility, focused tools.",
  },
  {
    key: "manager",
    icon: Users,
    label: "Manager",
    color: "#8b5cf6",
    sees: ["Department-level stats", "Team rosters", "Task approvals"],
    description: "VPs and middle management. The department is your scope.",
  },
  {
    key: "team_lead",
    icon: Star,
    label: "Team Lead",
    color: "#a855f7",
    sees: ["Team progress", "Member assignments", "Daily coordination"],
    description: "Run your team without needing the CEO's input.",
  },
  {
    key: "employee",
    icon: User,
    label: "Employee",
    color: "#c084fc",
    sees: ["Personal tasks", "Today's schedule", "Improvement opportunities"],
    description: "Just what you need to do your best work.",
  },
];

export function RoleCarousel() {
  const [active, setActive] = useState(0);
  const role = ROLES[active];
  const Icon = role.icon;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
      {/* Tabs */}
      <div className="flex md:flex-col gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
        {ROLES.map((r, i) => {
          const isActive = i === active;
          const RIcon = r.icon;
          return (
            <button
              key={r.key}
              onClick={() => setActive(i)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all shrink-0 md:shrink-1 ${
                isActive
                  ? "bg-white shadow-md border border-border"
                  : "bg-transparent hover:bg-white/60 border border-transparent"
              }`}
            >
              <div
                className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center"
                style={{
                  background: isActive ? r.color : `${r.color}15`,
                  color: isActive ? "#fff" : r.color,
                  boxShadow: isActive ? `0 4px 14px -2px ${r.color}55` : "none",
                }}
              >
                <RIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{r.label}</div>
                <div className="text-xs text-muted-foreground truncate">{r.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Preview */}
      <div className="relative rounded-3xl border border-border bg-white p-8 shadow-md overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, ${role.color}, transparent)` }}
        />

        <div className="flex items-center gap-3 mb-6">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center"
            style={{ background: role.color, boxShadow: `0 8px 24px -6px ${role.color}66` }}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">{role.label} dashboard</div>
            <div className="text-sm text-muted-foreground">{role.description}</div>
          </div>
        </div>

        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          What they see
        </div>
        <div className="space-y-2">
          {role.sees.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: role.color, boxShadow: `0 0 8px ${role.color}` }}
              />
              <span className="text-sm font-medium">{s}</span>
            </div>
          ))}
        </div>

        {/* Mock progress bar specific to role */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Sample completion</span>
            <span className="font-semibold" style={{ color: role.color }}>
              {[84, 76, 68, 91, 82][active]}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${[84, 76, 68, 91, 82][active]}%`,
                background: `linear-gradient(90deg, ${role.color}cc, ${role.color})`,
                boxShadow: `0 0 12px ${role.color}66`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
