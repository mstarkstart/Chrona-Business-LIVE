import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveWorkspace } from "@/lib/auth/session";
import { ChevronRight } from "lucide-react";

export default async function OrganisationOverview() {
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  const [{ count: depts }, { count: teams }, { count: members }] = await Promise.all([
    supabase.from("departments").select("id", { count: "exact", head: true }).eq("workspace_id", active.workspace.id),
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("workspace_id", active.workspace.id),
    supabase.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", active.workspace.id).eq("status", "active"),
  ]);

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto animate-fade-up">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Organisation</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Manage your organizational units, collaborative teams, and member directory for <strong>{active.workspace.name}</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Departments Card */}
        <Link href="/organisation/departments" className="group block relative">
          <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-indigo-500/25 hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between">
            {/* Top color accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-violet-600" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-100 group-hover:scale-110 transition-transform">
                  🏢
                </div>
                <div className="text-[10px] text-muted-foreground font-mono font-bold uppercase bg-slate-50 border border-border px-2.5 py-1 rounded-full">
                  Structure
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-foreground group-hover:text-indigo-600 transition-colors">Departments</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Manage functional divisions, map operational units, and structure business hierarchies.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-foreground">{depts ?? 0}</span>
                <span className="text-xs font-bold text-muted-foreground">active</span>
              </div>
              <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Configure <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </Link>

        {/* Teams Card */}
        <Link href="/organisation/teams" className="group block relative">
          <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-orange-500/25 hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between">
            {/* Top color accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-450 to-amber-500" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-lg border border-orange-100 group-hover:scale-110 transition-transform">
                  👥
                </div>
                <div className="text-[10px] text-muted-foreground font-mono font-bold uppercase bg-slate-50 border border-border px-2.5 py-1 rounded-full">
                  Collaboration
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-foreground group-hover:text-orange-655 transition-colors">Teams</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Organize members into collaborative teams, track collective velocity, and assign leads.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-foreground">{teams ?? 0}</span>
                <span className="text-xs font-bold text-muted-foreground">squads</span>
              </div>
              <span className="text-xs font-bold text-orange-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Manage squads <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </Link>

        {/* Members Card */}
        <Link href="/organisation/members" className="group block relative">
          <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-emerald-500/25 hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between">
            {/* Top color accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-450 to-teal-500" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-100 group-hover:scale-110 transition-transform">
                  🧑‍💻
                </div>
                <div className="text-[10px] text-muted-foreground font-mono font-bold uppercase bg-slate-50 border border-border px-2.5 py-1 rounded-full">
                  Directory
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-foreground group-hover:text-emerald-650 transition-colors">Members</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Invite your colleagues, assign access control roles, and view user presence status.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-foreground">{members ?? 0}</span>
                <span className="text-xs font-bold text-muted-foreground">colleagues</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                View directory <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
