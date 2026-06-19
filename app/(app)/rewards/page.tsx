import Link from "next/link";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import { getLeaderboard } from "@/lib/rewards/actions";
import { supabaseAdmin } from "@/lib/supabase/admin";

const QUOTES = [
  "The secret of getting ahead is getting started. — Mark Twain",
  "It always seems impossible until it's done. — Nelson Mandela",
  "Don't watch the clock; do what it does. Keep going. — Sam Levenson",
  "Success is the sum of small efforts, repeated day in and day out. — Robert Collier",
  "Opportunities don't happen, you create them. — Chris Grosser",
];

function getMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

function getRankBorder(rank: number): string {
  if (rank === 1) return "border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50";
  if (rank === 2) return "border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-slate-50";
  if (rank === 3) return "border-2 border-amber-600 bg-gradient-to-br from-amber-50 to-orange-50";
  return "border border-border bg-white";
}

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

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            🏆 Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{active.workspace.name} · Top performers this cycle</p>
        </div>
        <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">← Dashboard</Link>
      </header>

      {/* Motivational quote */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-5 py-3">
        <p className="text-sm text-indigo-700 italic">"{quote}"</p>
      </div>

      {/* My stats card */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-5">
        <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">Your stats</div>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-700">{myPoints?.points ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Points</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-700">{myPoints?.tasks_completed ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Tasks done</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-700">
              {myPoints?.streak_days ?? 0}
              {(myPoints?.streak_days ?? 0) > 0 && " 🔥"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Day streak</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-700">
              {myRank > 0 ? `#${myRank}` : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Rank</div>
          </div>
        </div>
      </div>

      {/* Top 3 podium */}
      {top3.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Top performers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {top3.map((entry, i) => {
              const rank = i + 1;
              return (
                <div key={entry.userId} className={`rounded-xl p-5 flex flex-col items-center gap-2 shadow-sm ${getRankBorder(rank)}`}>
                  <div className="text-4xl">{getMedal(rank)}</div>
                  <div className="text-center">
                    <div className="font-bold text-base truncate max-w-[120px]">{entry.name}</div>
                    <div className="text-xs text-muted-foreground">Rank #{rank}</div>
                  </div>
                  <div className="mt-1 text-2xl font-bold text-indigo-600">{entry.points}</div>
                  <div className="text-xs text-muted-foreground -mt-1">points</div>
                  <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    <span>{entry.tasksCompleted} tasks</span>
                    {entry.streakDays > 0 && <span>🔥 {entry.streakDays}d</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Remaining ranked list */}
      {rest.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Rankings</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            {rest.map((entry, i) => {
              const rank = i + 4;
              const isMe = entry.userId === user.id;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 ${isMe ? "bg-indigo-50" : "bg-white"}`}
                >
                  <span className="w-6 text-sm font-bold text-muted-foreground text-center">#{rank}</span>
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {entry.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isMe ? "text-indigo-700" : ""}`}>
                      {entry.name}{isMe && " (you)"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.tasksCompleted} tasks completed
                      {entry.streakDays > 0 && ` · 🔥 ${entry.streakDays} day streak`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-indigo-600">{entry.points}</div>
                    <div className="text-xs text-muted-foreground">pts</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {leaderboard.length === 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-12 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <div className="font-semibold text-muted-foreground">No points yet</div>
          <div className="text-sm text-muted-foreground mt-1">Complete tasks to earn points and appear on the leaderboard.</div>
        </div>
      )}

      {/* How points work */}
      <div className="rounded-xl border border-border bg-white p-5">
        <h2 className="font-semibold text-sm mb-4">How points work</h2>
        <ul className="space-y-2.5">
          {[
            { icon: "✅", label: "Complete a task", points: "+10 points" },
            { icon: "⚡", label: "Complete before due date", points: "+5 bonus" },
            { icon: "🌅", label: "First task of the day", points: "+3 bonus" },
            { icon: "🔥", label: "7-day streak", points: "+25 bonus" },
          ].map(({ icon, label, points }) => (
            <li key={label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="text-base">{icon}</span>
                <span className="text-muted-foreground">{label}</span>
              </span>
              <span className="font-semibold text-indigo-600">{points}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
