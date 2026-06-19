"use client";

/**
 * WorkloadView — server-fetched data rendered as a recharts horizontal bar chart.
 *
 * Usage (in a Server Component):
 *   import { WorkloadView } from "@/components/dashboard/WorkloadView";
 *   const data = await fetchWorkloadData(workspaceId);
 *   return <WorkloadView data={data} />;
 *
 * Or use the <WorkloadViewServer workspaceId={...} /> wrapper below which
 * does the Supabase fetch and passes data down.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  LabelList,
} from "recharts";

export interface WorkloadMember {
  name: string;
  taskCount: number;
}

function barColor(count: number): string {
  if (count <= 5) return "#22c55e";   // green-500
  if (count <= 10) return "#f59e0b";  // amber-500
  return "#ef4444";                   // red-500
}

interface WorkloadViewProps {
  data: WorkloadMember[];
}

export function WorkloadView({ data }: WorkloadViewProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400">
        No workload data available for the next 7 days.
      </div>
    );
  }

  // Sort descending for readability
  const sorted = [...data].sort((a, b) => b.taskCount - a.taskCount);

  const barHeight = 44;
  const chartHeight = Math.max(160, sorted.length * barHeight + 40);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Team Workload — Next 7 Days</h3>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> 0–5
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> 6–10
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> 10+
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            horizontal={false}
            strokeDasharray="3 3"
            stroke="#f3f4f6"
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            domain={[0, "dataMax + 2"]}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fontSize: 12, fill: "#374151" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "#f9fafb" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as WorkloadMember;
              return (
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-xs">
                  <span className="font-medium text-gray-800">{d.name}</span>
                  <span className="ml-2 text-gray-500">{d.taskCount} open tasks</span>
                </div>
              );
            }}
          />
          <Bar dataKey="taskCount" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {sorted.map((entry) => (
              <Cell key={entry.name} fill={barColor(entry.taskCount)} />
            ))}
            <LabelList
              dataKey="taskCount"
              position="right"
              style={{ fontSize: 11, fill: "#6b7280", fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Server-side data fetching helper ────────────────────────────────────────
// Import this in a Server Component to get fresh data from Supabase.

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function fetchWorkloadData(workspaceId: string): Promise<WorkloadMember[]> {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Fetch tasks assigned within the next 7 days that are not yet completed
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, assigned_to, due_date, status, workspace_id")
    .eq("workspace_id", workspaceId)
    .neq("status", "completed")
    .neq("status", "cancelled")
    .not("assigned_to", "is", null)
    .lte("due_date", sevenDaysLater.toISOString())
    .gte("due_date", now.toISOString());

  if (error || !tasks) return [];

  // Collect unique assignee IDs
  const assigneeIds = [...new Set(tasks.map((t) => t.assigned_to as string))];
  if (assigneeIds.length === 0) return [];

  // Fetch profile names
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, preferred_name")
    .in("id", assigneeIds);

  const profileMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    const name =
      p.preferred_name ??
      (`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unknown");
    profileMap.set(p.id, name);
  }

  // Aggregate counts
  const counts = new Map<string, number>();
  for (const task of tasks) {
    const aid = task.assigned_to as string;
    counts.set(aid, (counts.get(aid) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([id, taskCount]) => ({
    name: profileMap.get(id) ?? "Unknown",
    taskCount,
  }));
}

// ── Convenience server wrapper ───────────────────────────────────────────────
// In a Server Component file you can do:
//   import { WorkloadViewServer } from "@/components/dashboard/WorkloadView";
//   <WorkloadViewServer workspaceId="..." />

export async function WorkloadViewServer({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const data = await fetchWorkloadData(workspaceId);
  return <WorkloadView data={data} />;
}
