import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import Link from "next/link";
import type { Tables, NotificationType } from "@/lib/supabase/types";
import type { ReactNode } from "react";
import {
  CheckCheck, Bell, UserCheck, ThumbsUp, ThumbsDown,
  ClipboardCheck, ClipboardX, Inbox, Sparkles,
  ArrowRight, Folder, User, CheckCircle2, X
} from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { respondToTaskAction } from "@/lib/tasks/mutations";

// ── server actions ─────────────────────────────────────────────────────────


async function markAllRead() {
  "use server";
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id).is("read_at", null);
  revalidatePath("/inbox");
}

async function markOneRead(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id"));
  const supabase = await createSupabaseServerClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/inbox");
}

// ── helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── constants ──────────────────────────────────────────────────────────────

const VALID_NOTIF_TYPES = new Set<string>([
  "task_assignment","approval_request","task_accepted",
  "task_declined","task_approved","task_rejected","task_completion",
]);

const ACCENT: Record<NotificationType, { border: string; iconBg: string; dot: string; cardBg: string }> = {
  task_assignment: { border: "#6366f1", iconBg: "rgba(99,102,241,0.15)",  dot: "#6366f1", cardBg: "rgba(238,240,255,0.92)" },
  approval_request:{ border: "#f59e0b", iconBg: "rgba(245,158,11,0.15)",  dot: "#f59e0b", cardBg: "rgba(255,251,235,0.92)" },
  task_accepted:   { border: "#10b981", iconBg: "rgba(16,185,129,0.15)",  dot: "#10b981", cardBg: "rgba(236,253,245,0.92)" },
  task_declined:   { border: "#ef4444", iconBg: "rgba(239,68,68,0.15)",   dot: "#ef4444", cardBg: "rgba(255,241,241,0.92)" },
  task_approved:   { border: "#10b981", iconBg: "rgba(16,185,129,0.15)",  dot: "#10b981", cardBg: "rgba(236,253,245,0.92)" },
  task_rejected:   { border: "#ef4444", iconBg: "rgba(239,68,68,0.15)",   dot: "#ef4444", cardBg: "rgba(255,241,241,0.92)" },
  task_completion: { border: "#10b981", iconBg: "rgba(16,185,129,0.15)",  dot: "#10b981", cardBg: "rgba(236,253,245,0.92)" },
};

const ICON_BY_TYPE: Record<NotificationType, ReactNode> = {
  task_assignment: <UserCheck className="h-4 w-4 text-indigo-600" />,
  approval_request:<ClipboardCheck className="h-4 w-4 text-amber-600" />,
  task_accepted:   <ThumbsUp className="h-4 w-4 text-emerald-600" />,
  task_declined:   <ThumbsDown className="h-4 w-4 text-red-600" />,
  task_approved:   <ThumbsUp className="h-4 w-4 text-emerald-600" />,
  task_rejected:   <ClipboardX className="h-4 w-4 text-red-600" />,
  task_completion: <ThumbsUp className="h-4 w-4 text-emerald-600" />,
};

const TYPE_LABEL: Record<NotificationType, string> = {
  task_assignment:  "Task assigned to you",
  approval_request: "Approval requested",
  task_accepted:    "Task accepted",
  task_declined:    "Task declined",
  task_approved:    "Task approved",
  task_rejected:    "Task rejected",
  task_completion:  "Task completed",
};

const PRIORITY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: "Urgent", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  high:   { label: "High",   color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  normal: { label: "Normal", color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  low:    { label: "Low",    color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

const VALID_PRIORITIES = new Set(Object.keys(PRIORITY_STYLES));

type Tab = "all" | "assigned" | "approvals";

const TABS: { id: Tab; label: string }[] = [
  { id: "all",       label: "All" },
  { id: "assigned",  label: "Assigned to Me" },
  { id: "approvals", label: "Approvals" },
];

type TaskContext = {
  projectName: string | null;
  assignedByName: string | null;
  priority: string | null;
  status: string | null;
  assignedTo: string | null;
};

// ── notification card ──────────────────────────────────────────────────────

function NotificationCard({
  n,
  taskCtx,
}: {
  n: Tables<"notifications">;
  taskCtx?: TaskContext;
}) {
  const isUnread = n.read_at === null;
  const type: NotificationType = VALID_NOTIF_TYPES.has(n.type)
    ? (n.type as NotificationType)
    : "task_assignment";
  const accent = ACCENT[type];
  const icon = ICON_BY_TYPE[type] ?? <Bell className="h-4 w-4 text-slate-500" />;
  const label = TYPE_LABEL[type] ?? "Notification";
  const priority = taskCtx?.priority && VALID_PRIORITIES.has(taskCtx.priority)
    ? PRIORITY_STYLES[taskCtx.priority as keyof typeof PRIORITY_STYLES]
    : null;

  const inner = (
    <div
      className="relative rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group/card"
      style={{
        background: isUnread ? accent.cardBg : "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${isUnread ? accent.border + "35" : "rgba(200,210,230,0.50)"}`,
        borderLeft: `4px solid ${accent.border}`,
        boxShadow: isUnread
          ? `0 2px 16px ${accent.border}18, inset 0 1px 0 rgba(255,255,255,0.95)`
          : "0 1px 8px rgba(100,130,160,0.10), inset 0 1px 0 rgba(255,255,255,0.90)",
      }}
    >
      {/* Unread dot */}
      {isUnread && (
        <span className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full animate-pulse z-10"
          style={{ background: accent.dot, boxShadow: `0 0 5px ${accent.dot}` }} />
      )}

      <div className="px-4 py-3.5 flex items-start gap-3">
        {/* Icon bubble */}
        <div className="mt-0.5 h-9 w-9 shrink-0 rounded-xl flex items-center justify-center"
          style={{ background: accent.iconBg, border: `1px solid ${accent.border}28` }}>
          {icon}
        </div>

        <div className="flex-1 min-w-0 pr-6">
          {/* Type + time + priority */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: accent.border }}>
              {label}
            </span>
            <span className="text-[10px] text-slate-400">·</span>
            <span className="text-[10px] text-slate-400">{timeAgo(n.created_at)}</span>
            {priority && (
              <span className="text-[10px] font-bold px-1.5 py-px rounded-full"
                style={{ color: priority.color, background: priority.bg }}>
                {priority.label}
              </span>
            )}
            {type === "task_assignment" && (
              <>
                <span className="text-[10px] text-slate-400">·</span>
                {taskCtx ? (
                  taskCtx.assignedTo === n.user_id ? (
                    taskCtx.status === "awaiting_acceptance" ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600">
                        Awaiting Decision
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
                        Accepted
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600">
                      Declined
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600">
                    Declined
                  </span>
                )}
              </>
            )}
          </div>

          {/* Title */}
          <p className={`text-sm font-semibold leading-snug truncate ${isUnread ? "text-slate-800" : "text-slate-500"}`}>
            {n.title}
          </p>

          {/* Body — restored as 1 truncated line */}
          {n.body && (
            <p className="text-xs text-slate-500 truncate mt-0.5 leading-snug">{n.body}</p>
          )}

          {/* Context line */}
          {taskCtx && (taskCtx.projectName || taskCtx.assignedByName) && (
            <div className="flex items-center gap-2 mt-1">
              {taskCtx.projectName && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Folder className="h-3 w-3" />{taskCtx.projectName}
                </span>
              )}
              {taskCtx.projectName && taskCtx.assignedByName && (
                <span className="text-[11px] text-slate-300">·</span>
              )}
              {taskCtx.assignedByName && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <User className="h-3 w-3" />{taskCtx.assignedByName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Arrow hint */}
        {n.task_id && type !== "task_assignment" && (
          <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-1 opacity-0 group-hover/card:opacity-50 transition-opacity"
            style={{ color: accent.border }} />
        )}
      </div>
    </div>
  );

  const acceptAction = respondToTaskAction.bind(null, n.task_id!, n.id, "accept");
  const declineAction = respondToTaskAction.bind(null, n.task_id!, n.id, "decline");

  return (
    <div className="group relative">
      {n.task_id
        ? <Link href={`/tasks/${n.task_id}`} className="block">{inner}</Link>
        : inner
      }
      {type === "task_assignment" && n.task_id && taskCtx?.status === "awaiting_acceptance" && taskCtx?.assignedTo === n.user_id && (
        <div className="absolute right-6 bottom-4 flex gap-2 z-20">
          <form action={acceptAction}>
            <SubmitButton className="h-8 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm border-none">
              <CheckCircle2 className="h-3.5 w-3.5" /> Accept
            </SubmitButton>
          </form>
          <form action={declineAction}>
            <SubmitButton variant="outline" className="h-8 px-3 py-1.5 text-xs font-semibold border-red-200 text-red-600 hover:bg-red-50 rounded-lg">
              <X className="h-3.5 w-3.5" /> Decline
            </SubmitButton>
          </form>
        </div>
      )}
      {isUnread && (
        <form action={markOneRead} className="absolute right-8 top-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <input type="hidden" name="id" value={n.id} />
          <button type="submit" title="Mark as read"
            className="p-1.5 rounded-lg shadow-sm hover:bg-white transition-all"
            style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(200,210,230,0.60)" }}>
            <CheckCheck className="h-3 w-3 text-indigo-500" />
          </button>
        </form>
      )}
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "assigned" || rawTab === "approvals" ? rawTab : "all";

  const user = await requireUser();
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (tab === "assigned")  query = query.eq("type", "task_assignment");
  if (tab === "approvals") query = query.eq("type", "approval_request");

  const { data: notifications } = await query;
  const items = (notifications ?? []) as Tables<"notifications">[];

  // Task context
  const taskIds = items.filter(n => n.task_id).map(n => n.task_id as string);
  const taskContextMap: Record<string, TaskContext> = {};

  if (taskIds.length > 0) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, priority, project_id, created_by, status, assigned_to, projects(name), profiles!tasks_created_by_profiles_fkey(first_name, last_name)")
      .in("id", taskIds);

    for (const t of tasks ?? []) {
      const task = t as any;
      const taskId = String(task.id ?? "");
      if (!taskId) continue;
      taskContextMap[taskId] = {
        projectName: task.projects?.name ?? null,
        assignedByName: task.profiles
          ? `${task.profiles.first_name ?? ""} ${task.profiles.last_name ?? ""}`.trim() || null
          : null,
        priority: task.priority ?? null,
        status: task.status ?? null,
        assignedTo: task.assigned_to ?? null,
      };
    }
  }

  // Counts
  const allNotifs = (await supabase.from("notifications").select("type, read_at").eq("user_id", user.id)).data ?? [];
  const unreadCount     = items.filter(n => n.read_at === null).length;
  const totalCount      = items.length;
  const assignedCount   = allNotifs.filter(n => n.type === "task_assignment").length;
  const approvalsCount  = allNotifs.filter(n => n.type === "approval_request").length;
  const unreadAssigned  = allNotifs.filter(n => n.type === "task_assignment" && !n.read_at).length;
  const unreadApprovals = allNotifs.filter(n => n.type === "approval_request" && !n.read_at).length;
  const totalUnread     = allNotifs.filter(n => !n.read_at).length;

  const tabCounts: Record<Tab, { total: number; unread: number }> = {
    all:       { total: allNotifs.length, unread: totalUnread },
    assigned:  { total: assignedCount,    unread: unreadAssigned },
    approvals: { total: approvalsCount,   unread: unreadApprovals },
  };

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-up h-full">

      {/* ── Two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* ── Left: header + tabs + list ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Header */}
          <div
            className="relative overflow-hidden rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.82)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.80)",
              boxShadow: "0 4px 24px rgba(99,102,241,0.10), inset 0 1px 0 rgba(255,255,255,0.95)",
            }}
          >
            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-indigo-300/15 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-4 left-12 h-24 w-24 rounded-full bg-violet-300/12 blur-2xl pointer-events-none" />

            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl flex items-center justify-center shadow-md"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 14px rgba(99,102,241,0.30)" }}>
                  <Inbox className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight gradient-text inline-block">Inbox</h1>
                  <p className="text-xs text-slate-500 mt-px">
                    {totalUnread > 0
                      ? <><span className="font-bold text-indigo-600">{totalUnread} unread</span> · {allNotifs.length} total</>
                      : "All caught up"}
                  </p>
                </div>
              </div>

              {totalUnread > 0 && (
                <form action={markAllRead}>
                  <button type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 3px 10px rgba(99,102,241,0.28)" }}>
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
            style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(200,210,230,0.50)", boxShadow: "0 1px 8px rgba(100,130,160,0.08)" }}>
            {TABS.map(({ id, label }) => {
              const counts = tabCounts[id] ?? { total: 0, unread: 0 };
              const isActive = tab === id;
              return (
                <Link key={id} href={`/inbox?tab=${id}`}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
                  }`}
                  style={isActive ? { background: "rgba(255,255,255,0.95)", boxShadow: "0 1px 6px rgba(99,102,241,0.12)" } : {}}
                >
                  {label}
                  {counts.total > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-px rounded-full"
                      style={counts.unread > 0
                        ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white" }
                        : { background: "rgba(100,116,139,0.10)", color: "#64748b" }
                      }>
                      {counts.unread > 0 ? counts.unread : counts.total}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Notification list */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center rounded-2xl"
              style={{ background: "rgba(255,255,255,0.60)", border: "1px solid rgba(200,210,230,0.40)" }}>
              <div className="h-16 w-16 rounded-3xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.10),rgba(139,92,246,0.08))", border: "1px solid rgba(99,102,241,0.15)" }}>
                <Sparkles className="h-8 w-8 text-indigo-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">
                  {tab === "all" ? "Your inbox is empty" : tab === "assigned" ? "No task assignments yet" : "No approval requests"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {tab === "all" ? "You're all caught up!" : "New items will appear here"}
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((n) => (
                <li key={n.id}>
                  <NotificationCard
                    n={n}
                    taskCtx={n.task_id ? (taskContextMap[String(n.task_id)] ?? undefined) : undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Right: stats sidebar ── */}
        <div className="w-full lg:w-72 shrink-0 space-y-3">

          {/* Summary card */}
          <div className="rounded-2xl p-5 space-y-4"
            style={{
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(200,210,230,0.50)",
              boxShadow: "0 2px 16px rgba(100,130,160,0.10), inset 0 1px 0 rgba(255,255,255,0.95)",
            }}
          >
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Summary</h3>

            <div className="space-y-2.5">
              {[
                { label: "Total", value: allNotifs.length, color: "#6366f1", bg: "rgba(99,102,241,0.10)" },
                { label: "Unread", value: totalUnread, color: totalUnread > 0 ? "#f43f5e" : "#10b981", bg: totalUnread > 0 ? "rgba(244,63,94,0.10)" : "rgba(16,185,129,0.10)" },
                { label: "Assigned to me", value: assignedCount, color: "#6366f1", bg: "rgba(99,102,241,0.08)" },
                { label: "Approvals", value: approvalsCount, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className="flex items-center justify-between py-1.5 px-3 rounded-xl"
                  style={{ background: bg }}>
                  <span className="text-xs font-medium text-slate-600">{label}</span>
                  <span className="text-sm font-bold" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>

            {totalUnread > 0 && (
              <form action={markAllRead} className="pt-1">
                <button type="submit" className="w-full py-2 rounded-xl text-xs font-bold text-white transition-all hover:brightness-110"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 2px 8px rgba(99,102,241,0.25)" }}>
                  Mark all as read
                </button>
              </form>
            )}
          </div>

          {/* Quick filter links */}
          <div className="rounded-2xl p-4 space-y-1"
            style={{
              background: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(200,210,230,0.45)",
              boxShadow: "0 1px 8px rgba(100,130,160,0.06)",
            }}
          >
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2.5">Quick Filters</h3>
            {[
              { href: "/inbox",                    label: "All notifications", count: allNotifs.length,  icon: <Bell className="h-3.5 w-3.5" /> },
              { href: "/inbox?tab=assigned",       label: "Assigned to me",    count: assignedCount,     icon: <UserCheck className="h-3.5 w-3.5" /> },
              { href: "/inbox?tab=approvals",      label: "Approvals",         count: approvalsCount,    icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
            ].map(({ href, label, count, icon }) => (
              <Link key={href} href={href}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-white/80 hover:text-indigo-600 transition-all group">
                <span className="flex items-center gap-2 text-slate-500 group-hover:text-indigo-500 transition-colors">
                  {icon}{label}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-px rounded-full bg-slate-100 text-slate-500">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
