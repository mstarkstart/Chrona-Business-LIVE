import Link from "next/link";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import { getLeaderboard } from "@/lib/rewards/actions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Trophy, Flame, CheckCircle2, Zap, Sparkles, ArrowLeft, Award, HelpCircle } from "lucide-react";

const QUOTES = [
  "The secret of getting ahead is getting started. — Mark Twain",
  "It always seems impossible until it's done. — Nelson Mandela",
  "Don't watch the clock; do what it does. Keep going. — Sam Levenson",
  "Success is the sum of small efforts, repeated day in and day out. — Robert Collier",
  "Opportunities don't happen, you create them. — Chris Grosser",
];

export default async function RewardsPage() {
  const user = await requireUser();
  const active = await requireActiveWorkspace();

  const leaderboard = await getLeaderboard(active.workspace.id);

  // Fetch current user's points
  const { data: myPoints } = await supabaseAdmin
    .from("member_points")
    .select("*")
    .eq("workspace_id", active.workspace.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const myRank = leaderboard.findIndex((e) => e.userId === user.id) + 1;

  // Deterministic quote pick — rotates daily
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const quote = QUOTES[dayOfYear % QUOTES.length];

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  // Podium order: 2nd on the left, 1st in the middle, 3rd on the right
  const podiumOrder = [];
  if (top3[1]) podiumOrder.push({ rank: 2, entry: top3[1], color: "from-slate-100 to-slate-200 border-slate-300 text-slate-700 shadow-slate-200/50" });
  if (top3[0]) podiumOrder.push({ rank: 1, entry: top3[0], color: "from-amber-100 to-yellow-100 border-yellow-400 text-amber-800 shadow-yellow-200/50" });
  if (top3[2]) podiumOrder.push({ rank: 3, entry: top3[2], color: "from-orange-100 to-amber-50 border-orange-300 text-orange-900 shadow-orange-100/50" });

  // If there's only 1 top performer, just show 1st
  if (top3.length === 1) {
    podiumOrder.length = 0;
    podiumOrder.push({ rank: 1, entry: top3[0], color: "from-amber-100 to-yellow-100 border-yellow-400 text-amber-800 shadow-yellow-200/50" });
  }

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary shadow-sm">
              <Trophy className="h-5 w-5 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-900 to-violet-700 bg-clip-text text-transparent">
              Rewards &amp; Leaderboard
            </h1>
          </div>
          <p className="text-sm text-muted-foreground pl-12">
            {active.workspace.name} · Top performers this cycle
          </p>
        </div>
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 self-start sm:self-center px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </header>

      {/* Motivational Quote */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-50 bg-gradient-to-r from-indigo-50/50 to-violet-50/30 p-5 shadow-sm">
        <div className="absolute -top-10 -right-10 opacity-10">
          <Sparkles className="h-32 w-32 text-indigo-600" />
        </div>
        <div className="flex gap-3">
          <Sparkles className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-sm text-indigo-950 font-medium italic">
            "{quote}"
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Points", value: myPoints?.points ?? 0, desc: "Earned this cycle", icon: Trophy, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Tasks Completed", value: myPoints?.tasks_completed ?? 0, desc: "Accepted & verified", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Day Streak", value: `${myPoints?.streak_days ?? 0} days`, desc: "Keep it up!", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "Current Rank", value: myRank > 0 ? `#${myRank}` : "—", desc: "Out of members", icon: Award, color: "text-violet-600", bg: "bg-violet-50" },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx}
              className="group p-5 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-200/80"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.label}</span>
                <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{stat.value}</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{stat.desc}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Leaderboard Podium */}
      {top3.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 pl-1">
            Top Performers Podium
          </h2>
          <div className="flex flex-col md:flex-row items-stretch md:items-end justify-center gap-6 pt-4">
            {podiumOrder.map(({ rank, entry, color }) => {
              const isFirst = rank === 1;
              return (
                <div 
                  key={entry.userId}
                  className={`relative flex-1 flex flex-col items-center justify-between rounded-2xl border bg-gradient-to-b p-6 shadow-md transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg ${color} ${
                    isFirst ? "md:min-h-[300px] border-yellow-400 z-10 scale-100 md:scale-105" : "md:min-h-[260px] opacity-90"
                  }`}
                >
                  {isFirst && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      Champion
                    </div>
                  )}

                  <div className="flex flex-col items-center text-center space-y-3 w-full">
                    {/* Rank Badge */}
                    <div className={`h-12 w-12 rounded-full border-2 border-white/60 bg-white flex items-center justify-center text-xl font-black shadow-inner`}>
                      {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                    </div>

                    <div className="space-y-1">
                      <div className="font-extrabold text-lg text-slate-900 tracking-tight truncate max-w-[180px]">
                        {entry.name}
                      </div>
                      <div className="text-xs font-semibold text-indigo-600/80">
                        Rank #{rank}
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="text-3xl font-extrabold tracking-tight text-indigo-700">
                        {entry.points}
                      </span>
                      <span className="text-xs font-bold text-slate-500 ml-1">pts</span>
                    </div>
                  </div>

                  <div className="w-full mt-6 pt-4 border-t border-slate-200/50 flex justify-around text-center text-xs text-slate-500 font-medium">
                    <div>
                      <div className="font-bold text-slate-800">{entry.tasksCompleted}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tasks</div>
                    </div>
                    {entry.streakDays > 0 && (
                      <div>
                        <div className="font-bold text-orange-600 flex items-center gap-0.5 justify-center">
                          <Flame className="h-3 w-3 fill-orange-500" /> {entry.streakDays}d
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Streak</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Table/List for remaining and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ranked List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 pl-1">
            Complete Rankings
          </h2>
          
          {rest.length > 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-100">
                {rest.map((entry, idx) => {
                  const rank = idx + 4;
                  const isMe = entry.userId === user.id;
                  return (
                    <div 
                      key={entry.userId}
                      className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/50 ${
                        isMe ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      <span className="w-8 text-xs font-bold text-slate-400 text-center">#{rank}</span>
                      
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
                        {entry.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold truncate ${isMe ? "text-indigo-900" : "text-slate-800"}`}>
                          {entry.name} {isMe && <span className="ml-1.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">You</span>}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                          <span>{entry.tasksCompleted} tasks completed</span>
                          {entry.streakDays > 0 && (
                            <span className="flex items-center gap-0.5 text-orange-600 font-medium">
                              <Flame className="h-3 w-3 fill-orange-500" /> {entry.streakDays}d streak
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-extrabold text-indigo-600">{entry.points}</span>
                        <span className="text-[10px] font-bold text-slate-400 ml-0.5">pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            rest.length === 0 && top3.length > 0 ? (
              <div className="p-8 rounded-2xl border border-slate-100 bg-white text-center text-xs text-muted-foreground font-medium shadow-sm">
                No other ranked members in this cycle.
              </div>
            ) : null
          )}

          {leaderboard.length === 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="font-extrabold text-slate-800 text-base">No points logged yet</h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                Complete and verify tasks inside this workspace to earn points and claim your spot on the leaderboard!
              </p>
            </div>
          )}
        </div>

        {/* How points work */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 pl-1">
            Rules &amp; Scoring
          </h2>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <HelpCircle className="h-4.5 w-4.5 text-indigo-500" />
              <h3 className="font-bold text-sm text-slate-800">How to earn points</h3>
            </div>
            
            <ul className="space-y-4">
              {[
                { icon: "✅", label: "Complete a task", desc: "Successfully completed task", points: "+10 pts", color: "text-indigo-600" },
                { icon: "⚡", label: "On-time delivery", desc: "Done before the due date", points: "+5 pts", color: "text-emerald-600" },
                { icon: "🌅", label: "Early bird check", desc: "First task of the day", points: "+3 pts", color: "text-amber-600" },
                { icon: "🔥", label: "7-day streak bonus", desc: "Complete tasks 7 days in a row", points: "+25 pts", color: "text-orange-500" },
              ].map(({ icon, label, desc, points, color }) => (
                <li key={label} className="flex items-start justify-between gap-3 text-xs">
                  <div className="flex gap-2.5">
                    <span className="text-base shrink-0 mt-0.5">{icon}</span>
                    <div>
                      <div className="font-bold text-slate-700">{label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>
                    </div>
                  </div>
                  <span className={`font-bold shrink-0 ${color}`}>{points}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
