"use client";

import { useState, useEffect, useTransition } from "react";
import { Bell, CheckCircle2, XCircle, Check, CheckCheck, X, ArrowRight, Inbox, UserCheck, ThumbsUp, ThumbsDown, ClipboardCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/types";

type Notification = Tables<"notifications">;

const TYPE_LABEL: Record<string, string> = {
  task_assignment:  "Task assigned to you",
  task_accepted:    "Task accepted",
  task_declined:    "Task declined",
  task_completion:  "Task completed",
  approval_request: "Approval requested",
  task_approved:    "Task approved",
  task_rejected:    "Task rejected",
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  task_assignment:  <UserCheck className="h-3.5 w-3.5 text-indigo-500" />,
  task_accepted:    <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />,
  task_declined:    <ThumbsDown className="h-3.5 w-3.5 text-red-500" />,
  task_completion:  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  approval_request: <ClipboardCheck className="h-3.5 w-3.5 text-amber-500" />,
  task_approved:    <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />,
  task_rejected:    <XCircle className="h-3.5 w-3.5 text-red-500" />,
};

const TYPE_COLORS: Record<string, { icon: string; dot: string }> = {
  task_assignment:  { icon: "bg-indigo-100",  dot: "bg-indigo-500" },
  task_accepted:    { icon: "bg-emerald-100", dot: "bg-emerald-500" },
  task_declined:    { icon: "bg-red-100",     dot: "bg-red-500" },
  task_completion:  { icon: "bg-emerald-100", dot: "bg-emerald-500" },
  approval_request: { icon: "bg-amber-100",   dot: "bg-amber-500" },
  task_approved:    { icon: "bg-emerald-100", dot: "bg-emerald-500" },
  task_rejected:    { icon: "bg-red-100",     dot: "bg-red-500" },
};

function notifHref(n: Notification): string | null {
  if (n.task_id) return `/tasks/${n.task_id}`;
  return "/inbox";
}

export function NotificationBell({
  userId,
  initial,
}: {
  userId: string;
  initial: Notification[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>(initial);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setItems(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.length]);

  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => setItems((prev) => [payload.new as Notification, ...prev])
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => setItems((prev) => prev.map((n) => n.id === (payload.new as Notification).id ? payload.new as Notification : n))
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  function dismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  function markRead(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id)
      .then(() => setItems((prev) => prev.filter((n) => n.id !== id)));
  }

  function markAllRead() {
    const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds)
      .then(() => setItems([]));
  }

  function respondTask(taskId: string, notificationId: string, decision: "accept" | "decline", e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      await fetch("/api/tasks/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, decision, notificationId }),
      });
      setItems((prev) => prev.filter((n) => n.id !== notificationId));
      router.refresh();
    });
  }

  function handleNotifClick(n: Notification) {
    const href = notifHref(n);
    if (href) {
      // Mark as read silently
      if (!n.read_at) {
        supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id).then(() => {});
      }
      setOpen(false);
      router.push(href);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-[8px] text-[#344B63] hover:text-[#1E2D3D] hover:bg-white/45 active:scale-[0.88] active:bg-white/58 transition-all duration-130 ease-[cubic-bezier(0.34,1.56,0.64,1)] btn-press relative cursor-pointer"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow-sm animate-[badge-pulse_400ms_ease_600ms_1_forwards]"
            style={{ background: "linear-gradient(135deg, #f43f5e, #ec4899)" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 z-50 w-96 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.75)",
              boxShadow: "0 8px 40px rgba(30,45,61,0.18), 0 2px 8px rgba(30,45,61,0.08), inset 0 1px 0 rgba(255,255,255,0.90)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/60"
              style={{ background: "rgba(255,255,255,0.50)" }}>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-500" />
                <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Notifications</h3>
                {unread > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
                    <CheckCheck className="h-3.5 w-3.5" />All read
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-10 gap-3 text-center">
                  <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Inbox className="h-5 w-5 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>You&apos;re all caught up</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-white/50">
                  {items.map((n) => {
                    const isUnread = !n.read_at;
                    const colors = TYPE_COLORS[n.type] ?? { icon: "bg-slate-100", dot: "bg-slate-400" };
                    const icon = TYPE_ICON[n.type] ?? <Bell className="h-3.5 w-3.5 text-slate-500" />;
                    const label = TYPE_LABEL[n.type] ?? n.type;
                    const href = notifHref(n);
                    const isTaskAssign = n.type === "task_assignment" && n.task_id && isUnread;

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`relative px-4 py-3.5 transition-all duration-150 ${href ? "cursor-pointer" : ""} group`}
                        style={{
                          background: isUnread
                            ? "rgba(238,242,255,0.60)"
                            : "rgba(255,255,255,0.30)",
                        }}
                        onMouseEnter={e => { if (href) (e.currentTarget as HTMLElement).style.background = "rgba(238,242,255,0.85)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isUnread ? "rgba(238,242,255,0.60)" : "rgba(255,255,255,0.30)"; }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className={`mt-0.5 h-8 w-8 shrink-0 rounded-xl flex items-center justify-center shadow-sm border border-white/80 ${colors.icon}`}>
                            {icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Type label */}
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                              {label}
                            </p>
                            {/* Title */}
                            <p className={`text-xs font-semibold leading-tight truncate ${isUnread ? "text-slate-800" : "text-slate-500"}`}>
                              {n.title}
                            </p>
                            {/* Body */}
                            {n.body && (
                              <p className="text-[11px] mt-0.5 leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
                                {n.body}
                              </p>
                            )}
                            {/* Timestamp */}
                            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                              {new Date(n.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </p>

                            {/* Accept / Decline */}
                            {isTaskAssign && (
                              <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={(e) => respondTask(n.task_id!, n.id, "accept", e)}
                                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 transition-colors"
                                >
                                  <CheckCircle2 className="h-3 w-3" />Accept
                                </button>
                                <button
                                  onClick={(e) => respondTask(n.task_id!, n.id, "decline", e)}
                                  className="flex items-center gap-1.5 rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-50 transition-colors"
                                >
                                  <XCircle className="h-3 w-3" />Decline
                                </button>
                              </div>
                            )}

                            {/* View link for non-task-assignment notifications */}
                            {!isTaskAssign && href && isUnread && (
                              <div className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                View <ArrowRight className="h-3 w-3" />
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col items-center gap-1 shrink-0">
                            {isUnread && !isTaskAssign && (
                              <button onClick={(e) => markRead(n.id, e)} title="Mark as read"
                                className="h-6 w-6 rounded-full hover:bg-indigo-100 flex items-center justify-center text-indigo-400 transition-colors">
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                            <button onClick={(e) => dismiss(n.id, e)} title="Dismiss"
                              className="h-6 w-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                              <X className="h-3 w-3" />
                            </button>
                            {isUnread && <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-white/60 flex justify-center"
              style={{ background: "rgba(255,255,255,0.40)" }}>
              <button onClick={() => { setOpen(false); router.push("/inbox"); }}
                className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                View all in Inbox <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
