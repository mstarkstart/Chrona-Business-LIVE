"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import { Trash2, Send, MessageSquare } from "lucide-react";

type Comment = Tables<"task_comments"> & {
  author_name?: string;
};

interface Props {
  taskId: string;
  workspaceId: string;
  currentUserId: string;
  currentUserName: string;
}

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

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function authorName(c: Comment): string {
  return c.author_name || "Member";
}

export function TaskComments({ taskId, workspaceId, currentUserId, currentUserName }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ─── Fetch comments ──────────────────────────────────────────────────────────
  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      // Resolve author names from profiles
      const authorIds = [...new Set(data.map((c) => c.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", authorIds);
      const nameMap = new Map((profiles ?? []).map((p) => [
        p.id,
        [p.first_name, p.last_name].filter(Boolean).join(" ") || "Member",
      ]));
      setComments(data.map((c) => ({ ...c, author_name: nameMap.get(c.author_id) ?? "Member" })));
    }
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    fetchComments();

    // Realtime subscription for new inserts
    const channel = supabase
      .channel(`task_comments:${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_comments",
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          const newComment = payload.new as Tables<"task_comments">;
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", newComment.author_id)
            .maybeSingle();
          const author_name = profile
            ? ([profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Member")
            : "Member";
          const enriched: Comment = { ...newComment, author_name };
          setComments((prev) => {
            if (prev.some((c) => c.id === enriched.id)) return prev;
            return [...prev, enriched];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "task_comments",
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, fetchComments]);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments.length, loading]);

  // ─── Add comment ─────────────────────────────────────────────────────────────
  async function submitComment() {
    const text = body.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("task_comments").insert({
      task_id: taskId,
      workspace_id: workspaceId,
      author_id: currentUserId,
      body: text,
    });

    if (insertError) {
      setError("Failed to post comment. Please try again.");
    } else {
      setBody("");
    }
    setSubmitting(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitComment();
    }
  }

  // ─── Delete comment ───────────────────────────────────────────────────────────
  async function deleteComment(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id));
    const { error: deleteError } = await supabase
      .from("task_comments")
      .delete()
      .eq("id", id);

    if (deleteError) {
      // Restore on failure
      fetchComments();
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Comments
        </h3>
        {comments.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{comments.length}</span>
        )}
      </div>

      {/* Comments list */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 rounded bg-gray-200" />
                  <div className="h-3 w-full rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            No comments yet. Be the first to comment.
          </p>
        ) : (
          comments.map((c) => {
            const name = authorName(c);
            const isOwn = c.author_id === currentUserId;
            return (
              <div key={c.id} className="group flex gap-3">
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 select-none">
                  {initials(name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-gray-900">{name}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                    {c.body}
                  </p>
                </div>

                {/* Delete button — own comments only */}
                {isOwn && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    title="Delete comment"
                    className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose area */}
      <div className="flex gap-2 items-end">
        {/* Current user avatar */}
        <div className="h-8 w-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shrink-0 select-none">
          {initials(currentUserName || "Me")}
        </div>

        <div className="flex-1 relative">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment… (Enter to send, Shift+Enter for newline)"
            rows={2}
            disabled={submitting}
            className="w-full resize-none rounded-xl border border-border bg-gray-50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-60 transition-colors"
          />
        </div>

        <button
          onClick={submitComment}
          disabled={!body.trim() || submitting}
          title="Send comment"
          className="mb-0.5 p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
