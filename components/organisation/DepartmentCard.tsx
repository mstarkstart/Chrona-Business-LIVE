"use client";

import { Trash2, Users, CheckSquare, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DepartmentCardProps {
  id: string;
  name: string;
  description?: string;
  teamsCount: number;
  membersCount: number;
  activeTasksCount: number;
  canDelete: boolean;
  onDelete: (id: string) => Promise<void>;
}

export function DepartmentCard({
  id,
  name,
  description,
  teamsCount,
  membersCount,
  activeTasksCount,
  canDelete,
  onDelete,
}: DepartmentCardProps) {
  // Deterministic style and emoji based on name hash
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const accentColors = [
    { border: "border-l-indigo-500", bg: "from-indigo-50/50 to-indigo-50/0 hover:border-indigo-300", glow: "hover:shadow-indigo-500/5", iconBg: "bg-indigo-50 text-indigo-650" },
    { border: "border-l-emerald-500", bg: "from-emerald-50/50 to-emerald-50/0 hover:border-emerald-300", glow: "hover:shadow-emerald-500/5", iconBg: "bg-emerald-50 text-emerald-650" },
    { border: "border-l-amber-500", bg: "from-amber-50/50 to-amber-50/0 hover:border-amber-300", glow: "hover:shadow-amber-500/5", iconBg: "bg-amber-50 text-amber-650" },
    { border: "border-l-rose-500", bg: "from-rose-50/50 to-rose-50/0 hover:border-rose-300", glow: "hover:shadow-rose-500/5", iconBg: "bg-rose-50 text-rose-650" },
    { border: "border-l-sky-500", bg: "from-sky-50/50 to-sky-50/0 hover:border-sky-300", glow: "hover:shadow-sky-500/5", iconBg: "bg-sky-50 text-sky-650" },
    { border: "border-l-violet-500", bg: "from-violet-50/50 to-violet-50/0 hover:border-violet-300", glow: "hover:shadow-violet-500/5", iconBg: "bg-violet-50 text-violet-650" },
  ];
  
  const emojis = ["🏗️", "🎨", "🚀", "📈", "🛠️", "💬", "💼", "🤝", "🔒", "⚡"];
  
  const { border, bg, glow } = accentColors[hash % accentColors.length];
  const emoji = emojis[hash % emojis.length];

  return (
    <div className={`group relative flex flex-col justify-between rounded-xl border border-border bg-card bg-gradient-to-br ${bg} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${glow} border-l-4 ${border}`}>
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl select-none" role="img" aria-label="department icon">
              {emoji}
            </span>
            <div>
              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                {name}
              </h3>
              {description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          {canDelete && (
            <button
              onClick={() => onDelete(id)}
              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-muted-foreground hover:text-red-655 hover:bg-red-50 transition-all cursor-pointer duration-200"
              title="Delete department"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="my-4 border-t border-border" />
        
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="flex flex-col items-center p-2 rounded-lg bg-slate-50 border border-border">
            <Layers className="h-4.5 w-4.5 mb-1 text-muted-foreground/70" />
            <span className="font-semibold text-foreground">{teamsCount}</span>
            <span className="text-[10px] text-muted-foreground/60 mt-0.5">
              {teamsCount === 1 ? "team" : "teams"}
            </span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-slate-50 border border-border">
            <Users className="h-4.5 w-4.5 mb-1 text-muted-foreground/70" />
            <span className="font-semibold text-foreground">{membersCount}</span>
            <span className="text-[10px] text-muted-foreground/60 mt-0.5">
              {membersCount === 1 ? "member" : "members"}
            </span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-slate-50 border border-border">
            <CheckSquare className="h-4.5 w-4.5 mb-1 text-muted-foreground/70" />
            <span className="font-semibold text-foreground">{activeTasksCount}</span>
            <span className="text-[10px] text-muted-foreground/60 mt-0.5">active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
