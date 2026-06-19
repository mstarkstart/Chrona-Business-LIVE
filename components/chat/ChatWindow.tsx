"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Send, AlertCircle, RefreshCw, Users } from "lucide-react";

export type Message = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name: string;
  failed?: boolean;
};

type PresenceState = Record<string, { user_id: string; name: string; online_at: string }[]>;

type ChatWindowProps = {
  workspaceId: string;
  currentUserId: string;
  currentUserName: string;
  initialMessages: Message[];
  memberCount?: number;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function ChatWindow({ workspaceId, currentUserId, currentUserName, initialMessages, memberCount }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Name cache built from server-resolved initial messages
  const nameCacheRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    nameCacheRef.current.set(currentUserId, currentUserName);
    for (const m of initialMessages) {
      if (m.author_name && m.author_name !== "Member") {
        nameCacheRef.current.set(m.user_id, m.author_name);
      }
    }
  }, [currentUserId, currentUserName, initialMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime: new messages from others
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const row = payload.new as { id: string; user_id: string; body: string; created_at: string };
          const authorName = nameCacheRef.current.get(row.user_id) ?? row.user_id.slice(0, 2).toUpperCase();
          const msg: Message = { id: row.id, user_id: row.user_id, body: row.body, created_at: row.created_at, author_name: authorName };
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId]);

  // Presence: typing indicators
  useEffect(() => {
    const channel = supabase.channel(`presence:chat:${workspaceId}`, {
      config: { presence: { key: currentUserId } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as PresenceState;
        const others = Object.values(state).flat()
          .filter((p) => p.user_id !== currentUserId && (p as unknown as { typing?: boolean }).typing)
          .map((p) => p.name);
        setTypingUsers(others);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: currentUserId, name: currentUserName, typing: false, online_at: new Date().toISOString() });
        }
      });
    presenceChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); presenceChannelRef.current = null; };
  }, [workspaceId, currentUserId, currentUserName]);

  const broadcastTyping = useCallback(async (isTyping: boolean) => {
    if (!presenceChannelRef.current) return;
    await presenceChannelRef.current.track({ user_id: currentUserId, name: currentUserName, typing: isTyping, online_at: new Date().toISOString() });
  }, [currentUserId, currentUserName]);

  const handleDraftChange = (val: string) => {
    setDraft(val);
    broadcastTyping(val.length > 0);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { broadcastTyping(false); }, 2000);
  };

  const doSend = useCallback(async (body: string, optimisticId: string) => {
    const res = await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, body }),
    });
    if (!res.ok) {
      setMessages((prev) => prev.map((m) => m.id === optimisticId ? { ...m, failed: true } : m));
    } else {
      const { id } = await res.json() as { id: string };
      setMessages((prev) => prev.map((m) => m.id === optimisticId ? { ...m, id, failed: false } : m));
    }
  }, [workspaceId]);

  const sendMessage = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    broadcastTyping(false);

    const optimisticId = `optimistic-${Date.now()}`;
    setMessages((prev) => [...prev, { id: optimisticId, user_id: currentUserId, body, created_at: new Date().toISOString(), author_name: currentUserName }]);
    await doSend(body, optimisticId);
    setSending(false);
  }, [draft, sending, currentUserId, currentUserName, broadcastTyping, doSend]);

  const retryMessage = useCallback(async (msg: Message) => {
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, failed: false } : m));
    const newOptimisticId = `optimistic-retry-${Date.now()}`;
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, id: newOptimisticId } : m));
    await doSend(msg.body, newOptimisticId);
  }, [doSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const grouped = messages.map((msg, i) => {
    const prev = messages[i - 1];
    const isGrouped = prev && prev.user_id === msg.user_id && !prev.failed && !msg.failed && isSameDay(prev.created_at, msg.created_at);
    const showDayDivider = !prev || !isSameDay(prev.created_at, msg.created_at);
    return { msg, isGrouped, showDayDivider };
  });

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {/* Online strip */}
      {memberCount !== undefined && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/60 bg-white/80 backdrop-blur-sm shrink-0">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          <span className="text-xs text-muted-foreground font-medium">{memberCount} member{memberCount !== 1 ? "s" : ""} in workspace</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {grouped.map(({ msg, isGrouped, showDayDivider }) => {
          const isOwn = msg.user_id === currentUserId;
          return (
            <div key={msg.id}>
              {showDayDivider && (
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-border/60" />
                  <span className="text-[11px] font-semibold text-muted-foreground/70 bg-slate-100 px-3 py-1 rounded-full border border-border/40">
                    {formatDay(msg.created_at)}
                  </span>
                  <div className="flex-1 h-px bg-border/60" />
                </div>
              )}

              <div className={`flex items-end gap-2.5 ${isOwn ? "flex-row-reverse" : "flex-row"} ${isGrouped ? "mt-0.5" : "mt-4"}`}>
                {/* Avatar */}
                {!isGrouped ? (
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 shadow-sm ${
                    isOwn
                      ? "bg-gradient-to-br from-indigo-500 to-violet-600"
                      : "bg-gradient-to-br from-slate-500 to-slate-700"
                  }`}>
                    {msg.author_name.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <div className="h-8 w-8 shrink-0" />
                )}

                <div className={`flex flex-col gap-1 max-w-[72%] ${isOwn ? "items-end" : "items-start"}`}>
                  {/* Name + time */}
                  {!isGrouped && (
                    <div className={`flex items-baseline gap-2 px-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                      <span className="text-xs font-semibold text-foreground/80">{isOwn ? "You" : msg.author_name}</span>
                      <span className="text-[10px] text-muted-foreground/60">{formatTime(msg.created_at)}</span>
                    </div>
                  )}

                  {/* Bubble */}
                  {msg.failed ? (
                    <div className="flex items-center gap-2">
                      <div className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words bg-red-50 text-red-700 border border-red-200 rounded-br-sm">
                        {msg.body}
                      </div>
                      <button
                        onClick={() => retryMessage(msg)}
                        title="Retry"
                        className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm ${
                      isOwn
                        ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-sm"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-sm"
                    } ${isGrouped && isOwn ? "rounded-tr-lg" : ""} ${isGrouped && !isOwn ? "rounded-tl-lg" : ""}`}>
                      {msg.body}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 shadow-sm">
              <Users className="h-8 w-8 text-indigo-400" />
            </div>
            <p className="font-semibold text-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground mt-1">Say hello to your team 👋</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      <div className="px-5 h-5 shrink-0">
        {typingUsers.length > 0 && (
          <p className="text-[11px] text-muted-foreground italic">
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing…`
              : `${typingUsers.slice(0, -1).join(", ")} and ${typingUsers.at(-1)} are typing…`}
          </p>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/60 p-4 bg-white shrink-0">
        <div className="flex items-end gap-2.5 rounded-2xl border border-border bg-slate-50 px-4 py-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:bg-white transition-all shadow-sm">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the team… (Enter to send)"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 max-h-32 leading-relaxed"
            style={{ minHeight: "22px" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!draft.trim() || sending}
            className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
            title="Send (Enter)"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 px-1">Shift+Enter for new line</p>
      </div>
    </div>
  );
}
