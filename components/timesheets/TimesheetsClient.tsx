"use client";

import { useState, useTransition } from "react";
import { generateStandupSummaryAction } from "@/app/(app)/timesheets/actions";
import { STATUS_COLOUR, STATUS_LABEL } from "@/lib/realtime/presence";
import type { ActivityStatus } from "@/lib/supabase/types";
import { CupertinoLoaderPill } from "@/components/ui/CupertinoLoader";
import { Card, CardTitle } from "@/components/dashboard/Cards";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Clock,
  User,
  Activity,
  FileText,
  Calendar,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type LogRow = {
  id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  task_title: string | null;
};

type Member = {
  id: string;
  name: string;
  role: string;
  position: string | null;
  avatar_url: string | null;
};

type MemberSummary = {
  memberId: string;
  name: string;
  position: string | null;
  role: string;
  avatarUrl: string | null;
  totalHours: number;
};

interface TimesheetsClientProps {
  members: Member[];
  myMemberId: string;
  isManager: boolean;
  initialMemberLogs: LogRow[];
  initialMemberId: string;
  teamSummaries: MemberSummary[];
}

export function TimesheetsClient({
  members,
  myMemberId,
  isManager,
  initialMemberLogs,
  initialMemberId,
  teamSummaries,
}: TimesheetsClientProps) {
  const [selectedMemberId, setSelectedMemberId] = useState(initialMemberId);
  const [logs, setLogs] = useState<LogRow[]>(initialMemberLogs);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // AI standup summary state
  const [standupSummary, setStandupSummary] = useState<string | null>(null);
  const [generatingStandup, startGenerating] = useTransition();
  const [standupError, setStandupError] = useState<string | null>(null);

  const activeMember = members.find((m) => m.id === selectedMemberId) || members.find((m) => m.id === myMemberId);

  // Switch displayed member timesheet
  async function handleMemberChange(memberId: string) {
    setSelectedMemberId(memberId);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/workspace/member-logs?memberId=${memberId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  }

  // Trigger AI standup generation
  function handleGenerateStandup() {
    setStandupError(null);
    startGenerating(async () => {
      try {
        const summary = await generateStandupSummaryAction();
        setStandupSummary(summary);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStandupError(msg);
      }
    });
  }

  // Calculate durations and process chart data
  const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Initialize daily status hour buckets for the chart (past 7 days)
  const chartDataMap = new Map<string, Record<string, any>>();
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const weekday = DAYS_OF_WEEK[d.getDay()];
    chartDataMap.set(dateStr, {
      name: `${weekday} (${dateStr})`,
      Tasking: 0,
      Meeting: 0,
      Training: 0,
      Other: 0,
    });
  }

  let totalDurationMs = 0;
  let taskingMs = 0;
  let meetingMs = 0;
  let trainingMs = 0;
  let otherMs = 0;

  logs.forEach((log) => {
    const start = new Date(log.started_at);
    const end = log.ended_at ? new Date(log.ended_at) : new Date();
    const duration = end.getTime() - start.getTime();

    if (duration > 0) {
      totalDurationMs += duration;
      if (log.status === "tasking") taskingMs += duration;
      else if (log.status === "meeting") meetingMs += duration;
      else if (log.status === "training") trainingMs += duration;
      else otherMs += duration;

      // Map to chart day if it falls in the past 7 days
      const dateStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (chartDataMap.has(dateStr)) {
        const bucket = chartDataMap.get(dateStr)!;
        const hours = duration / (1000 * 60 * 60);
        if (log.status === "tasking") {
          bucket.Tasking = Number((bucket.Tasking + hours).toFixed(2));
        } else if (log.status === "meeting") {
          bucket.Meeting = Number((bucket.Meeting + hours).toFixed(2));
        } else if (log.status === "training") {
          bucket.Training = Number((bucket.Training + hours).toFixed(2));
        } else {
          bucket.Other = Number((bucket.Other + hours).toFixed(2));
        }
      }
    }
  });

  const totalHours = (totalDurationMs / (1000 * 60 * 60)).toFixed(1);
  const taskingHours = (taskingMs / (1000 * 60 * 60)).toFixed(1);
  const meetingHours = (meetingMs / (1000 * 60 * 60)).toFixed(1);
  const trainingHours = (trainingMs / (1000 * 60 * 60)).toFixed(1);
  const otherHours = (otherMs / (1000 * 60 * 60)).toFixed(1);

  const chartData = Array.from(chartDataMap.values());

  return (
    <div className="p-8 flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Time Tracking &amp; Productivity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Timesheets and activity statistics scoped to your active workspace
          </p>
        </div>

        {/* Member selector for managers */}
        {isManager && (
          <div className="flex items-center gap-3">
            <Label htmlFor="member-select" className="text-sm font-bold text-muted-foreground shrink-0">
              Inspect Timesheet:
            </Label>
            <select
              id="member-select"
              value={selectedMemberId}
              onChange={(e) => handleMemberChange(e.target.value)}
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-indigo-500"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* Main Grid: Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Hours Card */}
        <Card className="flex flex-col justify-between p-6 bg-indigo-50/50 border-indigo-100">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-indigo-700">
              <span className="text-xs font-bold uppercase tracking-wider">Total Tracked</span>
              <Clock className="h-4 w-4" />
            </div>
            <p className="text-4xl font-extrabold tracking-tight text-indigo-950 mt-2">{totalHours}h</p>
            <p className="text-xs text-indigo-600 mt-1">Logged this week</p>
          </div>
          <div className="mt-4 text-xs font-medium text-indigo-700">
            Active User: <span className="font-bold">{activeMember?.name}</span>
          </div>
        </Card>

        {/* Tasking Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between text-yellow-600">
            <span className="text-xs font-bold uppercase tracking-wider">Task Work</span>
            <FileText className="h-4 w-4" />
          </div>
          <p className="text-3xl font-extrabold tracking-tight mt-2 text-yellow-950">{taskingHours}h</p>
          <p className="text-xs text-muted-foreground mt-1">Status: Tasking</p>
        </Card>

        {/* Meeting Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between text-orange-600">
            <span className="text-xs font-bold uppercase tracking-wider">Meetings</span>
            <User className="h-4 w-4" />
          </div>
          <p className="text-3xl font-extrabold tracking-tight mt-2 text-orange-950">{meetingHours}h</p>
          <p className="text-xs text-muted-foreground mt-1">Status: Meeting</p>
        </Card>

        {/* Training & Other Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between text-indigo-500">
            <span className="text-xs font-bold uppercase tracking-wider">Other / Breaks</span>
            <Activity className="h-4 w-4" />
          </div>
          <p className="text-3xl font-extrabold tracking-tight mt-2 text-indigo-950">
            {(Number(trainingHours) + Number(otherHours)).toFixed(1)}h
          </p>
          <p className="text-xs text-muted-foreground mt-1">Training: {trainingHours}h · Break: {otherHours}h</p>
        </Card>
      </div>

      {/* Stacked Bar Chart */}
      <Card className="p-6">
        <CardTitle className="mb-4">Time Breakdown (Past 7 Days)</CardTitle>
        <div className="h-80 w-full mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={11} tickLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} unit="h" />
              <Tooltip
                contentStyle={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                labelClassName="font-bold text-xs"
              />
              <Legend wrapperStyle={{ fontSize: "11px", marginTop: "10px" }} />
              <Bar dataKey="Tasking" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Meeting" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Training" stackId="a" fill="#6b7280" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Other" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* AI Standup section for managers */}
      {isManager && (
        <Card className="p-6 border border-violet-100 bg-gradient-to-br from-white to-violet-50/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-violet-700">
                <Sparkles className="h-4.5 w-4.5" />
                <h3 className="font-bold text-base">AI Morning Standup Summary</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Synthesizes tasks completed yesterday, current active focus, and blockers across all workspace members
              </p>
            </div>
            <button
              onClick={handleGenerateStandup}
              disabled={generatingStandup}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold shadow-md shadow-indigo-600/10 hover:opacity-90 active:scale-95 disabled:opacity-60 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {generatingStandup ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Standup
                </>
              )}
            </button>
          </div>

          {generatingStandup && (
            <div className="mt-6 flex justify-center py-4">
              <CupertinoLoaderPill />
            </div>
          )}

          {standupError && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{standupError}</span>
            </div>
          )}

          {standupSummary && (
            <div className="mt-4 bg-white border border-violet-100 rounded-2xl p-5 shadow-inner">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-violet-50 text-xs font-bold text-violet-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>AI STANDUP OUTPUT</span>
              </div>
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-line space-y-2">
                {standupSummary}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Team Summary Table (Manager view) */}
      {isManager && teamSummaries.length > 0 && (
        <Card className="p-6">
          <CardTitle className="mb-4">Team Tracked Hours (This Week)</CardTitle>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider bg-muted/30">
                  <th className="py-3 px-4">Team Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4 text-right">Hours Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teamSummaries.map((ts) => (
                  <tr key={ts.memberId} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      {ts.avatarUrl ? (
                        <img src={ts.avatarUrl} alt={ts.name} className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {ts.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-foreground">{ts.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground capitalize">{ts.role}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{ts.position || "—"}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-indigo-700">{ts.totalHours.toFixed(1)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detailed Activity Logs */}
      <Card className="p-6">
        <CardTitle className="mb-4">
          {loadingLogs ? "Loading Logs..." : `Recent Activity Logs — ${activeMember?.name}`}
        </CardTitle>
        <div className="overflow-x-auto mt-4">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-6">No activity logs recorded this week.</p>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider bg-muted/30">
                  <th className="py-3 px-4">Activity Status</th>
                  <th className="py-3 px-4">Associated Task</th>
                  <th className="py-3 px-4">Started At</th>
                  <th className="py-3 px-4">Ended At</th>
                  <th className="py-3 px-4 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => {
                  const start = new Date(log.started_at);
                  const end = log.ended_at ? new Date(log.ended_at) : null;
                  const diffMs = (end || new Date()).getTime() - start.getTime();

                  const hours = Math.floor(diffMs / 3600000);
                  const minutes = Math.floor((diffMs % 3600000) / 60000);
                  const durationStr =
                    hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                  return (
                    <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: STATUS_COLOUR[log.status as ActivityStatus] }}
                          />
                          <span className="font-semibold capitalize text-foreground">
                            {STATUS_LABEL[log.status as ActivityStatus] || log.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground max-w-xs truncate">
                        {log.task_title ? (
                          <div className="flex items-center gap-1.5 text-indigo-600 font-semibold">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{log.task_title}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">None (manual status)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-xs">
                        {start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at{" "}
                        {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-xs">
                        {end ? (
                          <>
                            {end.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at{" "}
                            {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 animate-pulse">
                            Ongoing
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-foreground">
                        {durationStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
