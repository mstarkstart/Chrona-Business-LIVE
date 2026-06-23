"use client";

import { useState } from "react";
import { Trash2, Users, Crown, Layers, X, Shield, ArrowRight } from "lucide-react";

interface TeamCardProps {
  id: string;
  name: string;
  description?: string;
  departmentName?: string;
  leadMemberId?: string | null;
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
  canManageLead?: boolean;
  onDelete: (id: string) => Promise<void>;
  onSetLead?: (teamId: string, leadMemberId: string | null) => Promise<void>;
}

export function TeamCard({
  id,
  name,
  description,
  departmentName,
  leadMemberId,
  members,
  canDelete,
  canManageLead = false,
  onDelete,
  onSetLead,
}: TeamCardProps) {
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [updatingLead, setUpdatingLead] = useState(false);

  // Deterministic styling based on team name
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    { border: "border-l-indigo-500", bg: "from-indigo-50/40 to-indigo-50/0 hover:border-indigo-300", tagBg: "bg-indigo-50 text-indigo-600 border-indigo-100" },
    { border: "border-l-sky-500", bg: "from-sky-50/40 to-sky-50/0 hover:border-sky-300", tagBg: "bg-sky-50 text-sky-600 border-sky-100" },
    { border: "border-l-violet-500", bg: "from-violet-50/40 to-violet-50/0 hover:border-violet-300", tagBg: "bg-violet-50 text-violet-600 border-violet-100" },
    { border: "border-l-emerald-500", bg: "from-emerald-50/40 to-emerald-50/0 hover:border-emerald-300", tagBg: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    { border: "border-l-amber-500", bg: "from-amber-50/40 to-amber-50/0 hover:border-amber-300", tagBg: "bg-amber-50 text-amber-600 border-amber-100" },
  ];
  
  const { border, bg, tagBg } = colors[hash % colors.length];

  // Identify lead: 
  // 1. Try to find by leadMemberId
  // 2. Fallback to heuristic (manager/admin/owner in team)
  const explicitLead = leadMemberId ? members.find((m) => m.id === leadMemberId) : null;
  const heuristicLeads = members.filter(
    (m) => m.role === "manager" || m.role === "admin" || m.role === "owner"
  );
  
  const activeLead = explicitLead || (heuristicLeads.length > 0 ? heuristicLeads[0] : null);
  const leadName = activeLead
    ? `${activeLead.profile?.first_name || ""} ${activeLead.profile?.last_name || ""}`.trim()
    : "No Lead";
  const leadAvatar = activeLead ? activeLead.profile?.avatar_url : null;

  // Max 4 preview avatars
  const avatarPreview = members.slice(0, 4);
  const extraMembersCount = Math.max(0, members.length - 4);

  async function handleLeadChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!onSetLead) return;
    const value = e.target.value || null;
    setUpdatingLead(true);
    try {
      await onSetLead(id, value);
    } catch (err) {
      console.error("Failed to set team lead:", err);
      alert("Failed to update Team Lead. Please ensure your database migration 0016 was run.");
    } finally {
      setUpdatingLead(false);
    }
  }

  return (
    <>
      <div className={`group relative flex flex-col justify-between rounded-xl border border-border bg-card bg-gradient-to-br ${bg} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border-l-4 ${border}`}>
        <div>
          <div className="flex items-start justify-between">
            <div className="space-y-1.5 flex-1 cursor-pointer" onClick={() => setShowMembersModal(true)}>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                  {name}
                </h3>
                {departmentName ? (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tagBg}`}>
                    <Layers className="h-2.5 w-2.5" />
                    {departmentName}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 bg-slate-55 px-2 py-0.5 rounded-full border border-border font-medium">
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
                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer duration-200"
                title="Delete team"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="my-4 border-t border-border" />

          {/* Lead display */}
          <div className="flex items-center justify-between gap-2 mb-4 bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                {leadAvatar ? (
                  <img
                    src={leadAvatar}
                    alt={leadName}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary ring-2 ring-primary/20">
                    {activeLead ? (
                      `${activeLead.profile?.first_name?.[0] || ""}${activeLead.profile?.last_name?.[0] || ""}`.toUpperCase()
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
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Team Lead</div>
                <div className="text-xs font-semibold text-foreground">{leadName}</div>
              </div>
            </div>

            {/* Change Lead Select Box */}
            {canManageLead && onSetLead && (
              <div className="relative shrink-0">
                <select
                  onChange={handleLeadChange}
                  value={activeLead?.id || ""}
                  disabled={updatingLead}
                  className="h-7 rounded-lg border border-border bg-white px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                >
                  <option value="">Set Lead...</option>
                  {members.map((m) => {
                    const mName = `${m.profile?.first_name || ""} ${m.profile?.last_name || ""}`.trim() || "Member";
                    return (
                      <option key={m.id} value={m.id}>
                        {mName}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Members Avatars preview */}
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowMembersModal(true)}>
            <div className="flex -space-x-2.5 overflow-hidden">
              {avatarPreview.map((m, idx) => {
                const fullName = `${m.profile?.first_name || ""} ${m.profile?.last_name || ""}`.trim() || "Member";
                return (
                  <div key={idx} className="relative group/avatar" title={fullName}>
                    {m.profile?.avatar_url ? (
                      <img
                        src={m.profile.avatar_url}
                        alt={fullName}
                        className="h-7.5 w-7.5 rounded-full object-cover ring-2 ring-background hover:z-10 relative transition-transform"
                      />
                    ) : (
                      <div className="h-7.5 w-7.5 rounded-full bg-slate-100 ring-2 ring-background flex items-center justify-center text-[10px] text-slate-500 hover:z-10 relative transition-transform font-bold border border-border">
                        {`${m.profile?.first_name?.[0] || ""}${m.profile?.last_name?.[0] || ""}`.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {extraMembersCount > 0 && (
                <div className="h-7.5 w-7.5 rounded-full bg-indigo-50 ring-2 ring-background flex items-center justify-center text-[10px] text-indigo-600 font-bold z-10 border border-indigo-150">
                  +{extraMembersCount}
                </div>
              )}
              
              {members.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No members yet</span>
              )}
            </div>
            
            <button
              className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 border border-indigo-100 hover:border-indigo-200 px-2.5 py-1 rounded-lg transition-all active:scale-95"
              type="button"
            >
              <Users className="h-3.5 w-3.5" />
              <span>{members.length} Members</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Team Members Modal ─── */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setShowMembersModal(false)}
          />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-xl p-6 shadow-2xl animate-fade-up z-10 max-h-[80vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-foreground">{name} Members</h3>
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
                )}
              </div>
              <button 
                onClick={() => setShowMembersModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Members List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
              {members.map((m) => {
                const fullName = `${m.profile?.first_name || ""} ${m.profile?.last_name || ""}`.trim() || "Teammate";
                const isLead = m.id === leadMemberId || (activeLead && m.id === activeLead.id);
                
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
                          className="h-8.5 w-8.5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8.5 w-8.5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-border">
                          {`${m.profile?.first_name?.[0] || ""}${m.profile?.last_name?.[0] || ""}`.toUpperCase() || "?"}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground">{fullName}</span>
                          {isLead && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded-md">
                              <Crown className="h-2 w-2" />
                              Lead
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground capitalize">{m.role}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {members.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground italic">
                  No members assigned to this team.
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowMembersModal(false)}
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
