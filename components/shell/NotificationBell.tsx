"use client";

import { useState, useEffect, useTransition } from "react";
import { Bell, CheckCircle2, XCircle, Check, CheckCheck, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/types";

type Notification = Tables<"notifications">;

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

  // Sync with server data after router.refresh()
  useEffect(() => {
    setItems(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.length]);

  const unread = items.filter((n) => !n.read_at).length;

  // Subscribe to new notifications (INSERT) and read updates (UPDATE)
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setItems((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setItems((prev) =>
            prev.map((n) => n.id === (payload.new as Notification).id ? payload.new as Notification : n)
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  function dismiss(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  function markRead(id: string) {
    supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .then(() => {
        // Remove from list once marked — cleaner UX than dimming
        setItems((prev) => prev.filter((n) => n.id !== id));
      });
  }

  function markAllRead() {
    const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(() => {
        setItems((prev) => prev.filter((n) => n.read_at)); // keep only already-read (now all are read → clear)
        setItems([]);
      });
  }

  function respondTask(taskId: string, notificationId: string, decision: "accept" | "decline") {
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

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-96 rounded-2xl border border-border bg-white shadow-xl shadow-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">Notifications</h3>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <span className="text-xs text-muted-foreground">{unread} unread</span>
                )}
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    title="Mark all as read"
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    All read
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
              {items.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground italic">
                  No notifications.
                </div>
              )}
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3.5 ${n.read_at ? "opacity-60 bg-white" : "bg-indigo-50/50"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center ${
                      n.type === "task_assignment" ? "bg-indigo-100" :
                      n.type === "task_accepted"   ? "bg-emerald-100" :
                      n.type === "task_declined"   ? "bg-red-100" : "bg-gray-100"
                    }`}>
                      {n.type === "task_accepted"  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> :
                       n.type === "task_declined"  ? <XCircle      className="h-3.5 w-3.5 text-red-600" /> :
                                                     <Bell         className="h-3.5 w-3.5 text-indigo-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-tight">{n.title}</div>
                      {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </div>

                      {/* Accept / Decline for task_assignment */}
                      {n.type === "task_assignment" && n.task_id && !n.read_at && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => respondTask(n.task_id!, n.id, "accept")}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Accept
                          </button>
                          <button
                            onClick={() => respondTask(n.task_id!, n.id, "decline")}
                            className="flex items-center gap-1.5 rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-50"
                          >
                            <XCircle className="h-3 w-3" /> Decline
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Mark as read (for non-task_assignment unread) */}
                      {!n.read_at && n.type !== "task_assignment" && (
                        <button
                          onClick={() => markRead(n.id)}
                          title="Mark as read"
                          className="h-6 w-6 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      {/* Dismiss (always visible) */}
                      <button
                        onClick={() => dismiss(n.id)}
                        title="Dismiss"
                        className="h-6 w-6 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
