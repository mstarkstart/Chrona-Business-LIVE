"use client";

import { Trash2, Users, Crown, Layers } from "lucide-react";

interface TeamCardProps {
  id: string;
  name: string;
  description?: string;
  departmentName?: string;
  members: Array<{
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

export function TeamCard({
  id,
  name,
  description,
  departmentName,
  members,
  canDelete,
  onDelete,
}: TeamCardProps) {
  // Deterministic styling based on team name
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    { border: "border-l-indigo-500", bg: "from-indigo-50/50 to-indigo-50/0 hover:border-indigo-300", iconBg: "bg-indigo-50 text-indigo-650" },
    { border: "border-l-sky-500", bg: "from-sky-50/50 to-sky-50/0 hover:border-sky-300", iconBg: "bg-sky-50 text-sky-650" },
    { border: "border-l-violet-500", bg: "from-violet-50/50 to-violet-50/0 hover:border-violet-300", iconBg: "bg-violet-50 text-violet-650" },
    { border: "border-l-emerald-500", bg: "from-emerald-50/50 to-emerald-50/0 hover:border-emerald-300", iconBg: "bg-emerald-50 text-emerald-655" },
    { border: "border-l-amber-500", bg: "from-amber-50/50 to-amber-50/0 hover:border-amber-300", iconBg: "bg-amber-50 text-amber-655" },
  ];
  
  const { border, bg } = colors[hash % colors.length];

  // Identify leads (manager, owner, admin)
  const leads = members.filter(
    (m) => m.role === "manager" || m.role === "admin" || m.role === "owner"
  );
  const leadName = leads.length > 0
    ? `${leads[0].profile?.first_name || ""} ${leads[0].profile?.last_name || ""}`.trim()
    : "No Lead";
  const leadAvatar = leads.length > 0 ? leads[0].profile?.avatar_url : null;

  // Max 4 preview avatars
  const avatarPreview = members.slice(0, 4);
  const extraMembersCount = Math.max(0, members.length - 4);

  return (
    <div className={`group relative flex flex-col justify-between rounded-xl border border-border bg-card bg-gradient-to-br ${bg} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border-l-4 ${border}`}>
      <div>
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                {name}
              </h3>
              {departmentName ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Layers className="h-2.5 w-2.5" />
                  {departmentName}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-border">
                  General
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>

          {canDelete && (
            <button
              onClick={() => onDelete(id)}
              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-muted-foreground hover:text-red-655 hover:bg-red-55/10 transition-all cursor-pointer duration-200"
              title="Delete team"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="my-4 border-t border-border" />

        {/* Lead display */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative">
            {leadAvatar ? (
              <img
                src={leadAvatar}
                alt={leadName}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary ring-2 ring-primary/20">
                {leads.length > 0 ? (
                  `${leads[0].profile?.first_name?.[0] || ""}${leads[0].profile?.last_name?.[0] || ""}`.toUpperCase()
                ) : (
                  "?"
                )}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 ring-1 ring-background">
              <Crown className="h-2.5 w-2.5" />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Team Lead</div>
            <div className="text-xs font-semibold text-foreground">{leadName}</div>
          </div>
        </div>

        {/* Members Avatars preview */}
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2.5 overflow-hidden">
            {avatarPreview.map((m, idx) => {
              const fullName = `${m.profile?.first_name || ""} ${m.profile?.last_name || ""}`.trim() || "Member";
              return (
                <div key={idx} className="relative group/avatar cursor-pointer" title={fullName}>
                  {m.profile?.avatar_url ? (
                    <img
                      src={m.profile.avatar_url}
                      alt={fullName}
                      className="h-7 w-7 rounded-full object-cover ring-2 ring-background hover:z-10 relative transition-transform"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-slate-100 ring-2 ring-background flex items-center justify-center text-[10px] text-slate-500 hover:z-10 relative transition-transform font-bold border border-border">
                      {`${m.profile?.first_name?.[0] || ""}${m.profile?.last_name?.[0] || ""}`.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
              );
            })}
            
            {extraMembersCount > 0 && (
              <div className="h-7 w-7 rounded-full bg-indigo-50 ring-2 ring-background flex items-center justify-center text-[10px] text-indigo-650 font-bold z-10 border border-indigo-100">
                +{extraMembersCount}
              </div>
            )}
            
            {members.length === 0 && (
              <span className="text-xs text-muted-foreground italic">No members yet</span>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-slate-50 border border-border px-2.5 py-1 rounded-lg">
            <Users className="h-3.5 w-3.5" />
            <span>{members.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
