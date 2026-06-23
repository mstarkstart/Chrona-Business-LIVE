"use client";

import { useState } from "react";
import { Trash2, Users, CheckSquare, Layers, X, Shield } from "lucide-react";

interface DepartmentCardProps {
  id: string;
  name: string;
  description?: string;
  teamsCount: number;
  membersCount: number;
  activeTasksCount: number;
  teams?: Array<{ id: string; name: string }>;
  members?: Array<{
    id: string;
    role: string;
    profile: {
      first_name?: string;
      last_name?: string;
      avatar_url?: string | null;
    } | null;
  }>;
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
  teams = [],
  members = [],
  canDelete,
  onDelete,
}: DepartmentCardProps) {
  const [showModal, setShowModal] = useState(false);

  // Deterministic style and emoji based on name hash
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const accentColors = [
    { border: "border-l-indigo-500", bg: "from-indigo-50/40 to-indigo-50/0 hover:border-indigo-300", glow: "hover:shadow-indigo-500/5" },
    { border: "border-l-emerald-500", bg: "from-emerald-50/40 to-emerald-50/0 hover:border-emerald-300", glow: "hover:shadow-emerald-500/5" },
    { border: "border-l-amber-500", bg: "from-amber-50/40 to-amber-50/0 hover:border-amber-300", glow: "hover:shadow-amber-500/5" },
    { border: "border-l-rose-500", bg: "from-rose-50/40 to-rose-50/0 hover:border-rose-300", glow: "hover:shadow-rose-500/5" },
    { border: "border-l-sky-500", bg: "from-sky-50/40 to-sky-50/0 hover:border-sky-300", glow: "hover:shadow-sky-500/5" },
    { border: "border-l-violet-500", bg: "from-violet-50/40 to-violet-50/0 hover:border-violet-300", glow: "hover:shadow-violet-500/5" },
  ];
  
  const emojis = ["🏗️", "🎨", "🚀", "📈", "🛠️", "💬", "💼", "🤝", "🔒", "⚡"];
  
  const { border, bg, glow } = accentColors[hash % accentColors.length];
  const emoji = emojis[hash % emojis.length];

  return (
    <>
      <div 
        className={`group relative flex flex-col justify-between rounded-xl border border-border bg-card bg-gradient-to-br ${bg} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${glow} border-l-4 ${border}`}
      >
        <div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setShowModal(true)}>
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
                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer duration-200"
                title="Delete department"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="my-4 border-t border-border" />
          
          <div 
            className="grid grid-cols-3 gap-2 text-xs text-muted-foreground cursor-pointer"
            onClick={() => setShowModal(true)}
          >
            <div className="flex flex-col items-center p-2 rounded-lg bg-slate-50 border border-border hover:bg-slate-100 transition-colors">
              <Layers className="h-4.5 w-4.5 mb-1 text-muted-foreground/70" />
              <span className="font-semibold text-foreground">{teamsCount}</span>
              <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                {teamsCount === 1 ? "team" : "teams"}
              </span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-slate-50 border border-border hover:bg-slate-100 transition-colors">
              <Users className="h-4.5 w-4.5 mb-1 text-muted-foreground/70" />
              <span className="font-semibold text-foreground">{membersCount}</span>
              <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                {membersCount === 1 ? "member" : "members"}
              </span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-slate-50 border border-border hover:bg-slate-100 transition-colors">
              <CheckSquare className="h-4.5 w-4.5 mb-1 text-muted-foreground/70" />
              <span className="font-semibold text-foreground">{activeTasksCount}</span>
              <span className="text-[10px] text-muted-foreground/60 mt-0.5">active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Department Details Modal ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setShowModal(false)}
          />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-xl p-6 shadow-2xl animate-fade-up z-10 max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{emoji}</span>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{name} Department</h3>
                  {description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
              {/* Teams Section */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Teams ({teams.length})</span>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {teams.map((t) => (
                    <div 
                      key={t.id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-semibold text-foreground text-center truncate"
                    >
                      {t.name}
                    </div>
                  ))}
                  {teams.length === 0 && (
                    <div className="col-span-2 text-center py-4 text-xs text-muted-foreground/60 italic bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                      No teams in this department yet.
                    </div>
                  )}
                </div>
              </div>
              
              {/* Members Section */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>Members ({members.length})</span>
                </h4>
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {members.map((m) => {
                    const fullName = `${m.profile?.first_name || ""} ${m.profile?.last_name || ""}`.trim() || "Teammate";
                    
                    return (
                      <div 
                        key={m.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-card hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {m.profile?.avatar_url ? (
                            <img 
                              src={m.profile.avatar_url} 
                              alt={fullName} 
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-border">
                              {`${m.profile?.first_name?.[0] || ""}${m.profile?.last_name?.[0] || ""}`.toUpperCase() || "?"}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-semibold text-foreground">{fullName}</div>
                            <span className="text-[10px] text-muted-foreground capitalize">{m.role}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {members.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground italic bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                      No members assigned to this department yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl cursor-pointer transition-all active:scale-98"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
