"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Bot, User, CornerDownLeft, CheckCircle, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  actions?: Array<{ type: "task_created" | "doc_created" | "calendar_event_created"; title: string; detail?: string }> | null;
};

type ActionChip = {
  label: string;
  action: "draft_description" | "suggest_tasks" | "summarize_comments" | "general_chat";
  placeholder: string;
};

const ACTION_CHIPS: ActionChip[] = [
  {
    label: "Daily standup",
    action: "general_chat",
    placeholder: "Generate a standup summary — what did the team do, what's in progress, any blockers?",
  },
  {
    label: "Who's available?",
    action: "general_chat",
    placeholder: "Who on my team is available right now? List them with their current status.",
  },
  {
    label: "Overdue tasks",
    action: "general_chat",
    placeholder: "List all overdue tasks with their assignees and how many days past due.",
  },
  {
    label: "Analyse workload",
    action: "general_chat",
    placeholder: "Analyse team workload — who has the most tasks, who is underloaded, and give a distribution summary.",
  },
  {
    label: "What's blocking us?",
    action: "general_chat",
    placeholder: "Which in-progress tasks haven't moved recently? Identify blockers and stalled work across the team.",
  },
  {
    label: "Suggest meeting time",
    action: "general_chat",
    placeholder: "Based on who is currently available and their statuses, suggest a good meeting time window for the team today.",
  },
  {
    label: "Summarize workspace",
    action: "general_chat",
    placeholder: "Give me a full summary of the workspace — tasks, team activity, and priorities.",
  },
  {
    label: "Draft task description",
    action: "draft_description",
    placeholder: "Enter task title (e.g., 'Fix database index performance')",
  },
  {
    label: "Suggest next tasks",
    action: "suggest_tasks",
    placeholder: "Enter project context (e.g., 'E-commerce checkout redesign')",
  },
  {
    label: "How to use Chrona",
    action: "general_chat",
    placeholder: "Give me a quick overview of everything I can do in Chrona — the key features, how to navigate, and where to start.",
  },
];

// Simple markdown renderer to prevent raw star/formatting display
function renderMarkdown(text: string) {
  if (!text) return "";
  let html = text;
  
  // Hide streaming action blocks so the user never sees them typing out
  html = html.replace(/\[CREATE_TASK_ACTION\][\s\S]*/g, "");
  html = html.replace(/\[CREATE_DOC_ACTION\][\s\S]*/g, "");
  html = html.replace(/\[CREATE_CALENDAR_EVENT_ACTION\][\s\S]*/g, "");

  // Escaping HTML entities to prevent XSS in dangerouslySetInnerHTML
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold + Italics (***text***)
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  
  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  
  // Italics (*text*)
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
   // Inline Code (`code`)
  html = html.replace(/`(.*?)`/g, "<code class='bg-indigo-50 px-1 py-0.5 rounded text-[11px] text-indigo-600 font-mono'>$1</code>");
  
  // Newlines (\n)
  html = html.replace(/\n/g, "<br />");
  
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

// Parse action payload blocks from full AI response text
function parseAndStripActions(text: string): {
  cleanText: string;
  createTasks: Array<{ title: string; description?: string; priority?: string; due_date?: string | null; assignee_name?: string | null }>;
  createDocs: Array<{ title: string; content: string }>;
  createCalendarEvents: Array<{ title: string; date: string; start_time?: string; end_time?: string; event_type?: string; is_team?: boolean; description?: string | null }>;
} {
  let cleanText = text;
  const createTasks: any[] = [];
  const createDocs: any[] = [];
  const createCalendarEvents: any[] = [];

  // Match all tasks
  const taskRegex = /\[CREATE_TASK_ACTION\]\s*([\s\S]*?)\s*\[\/CREATE_TASK_ACTION\]/g;
  let taskMatch;
  while ((taskMatch = taskRegex.exec(text)) !== null) {
    try {
      createTasks.push(JSON.parse(taskMatch[1]));
    } catch { /* ignore */ }
  }
  cleanText = cleanText.replace(taskRegex, "").trim();

  // Match all docs
  const docRegex = /\[CREATE_DOC_ACTION\]\s*([\s\S]*?)\s*\[\/CREATE_DOC_ACTION\]/g;
  let docMatch;
  while ((docMatch = docRegex.exec(text)) !== null) {
    try {
      createDocs.push(JSON.parse(docMatch[1]));
    } catch { /* ignore */ }
  }
  cleanText = cleanText.replace(docRegex, "").trim();

  // Match all calendar events
  const calRegex = /\[CREATE_CALENDAR_EVENT_ACTION\]\s*([\s\S]*?)\s*\[\/CREATE_CALENDAR_EVENT_ACTION\]/g;
  let calMatch;
  while ((calMatch = calRegex.exec(text)) !== null) {
    try {
      createCalendarEvents.push(JSON.parse(calMatch[1]));
    } catch { /* ignore */ }
  }
  cleanText = cleanText.replace(calRegex, "").trim();

  return { cleanText, createTasks, createDocs, createCalendarEvents };
}

export function AIChatDrawer({
  open,
  onClose,
  workspaceId,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I'm **Chrona Nexus** ✨ — your fully agentic workspace AI.\n\nI can:\n• 📋 **Create tasks** — *'Create a task: Fix login bug, due Friday, high priority'*\n• 📅 **Create calendar events** — *'Schedule a team meeting tomorrow at 2pm for 1 hour'*\n• 🔍 **Check your calendar** — *'What's on my calendar this week?'*\n• 📊 **Analyse workload** — who's overloaded, who's free, what's blocked\n• 📝 **Daily standup** — summarise team activity and priorities\n• ✍️ **Draft task descriptions** — just give me a title\n\nTap a chip below or just type anything!",
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [activeChip, setActiveChip] = useState<ActionChip | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", user.id)
            .maybeSingle();
          if (profile?.avatar_url) {
            setAvatarUrl(profile.avatar_url);
          }
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
      }
    }
    loadProfile();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      window.dispatchEvent(new CustomEvent("chrona-ai-open"));
    } else {
      window.dispatchEvent(new CustomEvent("chrona-ai-close"));
    }
  }, [open]);

  const handleSend = async (textToSend?: string) => {
    const rawText = textToSend || input;
    if (!rawText.trim() || loading) return;

    const userMsgId = Date.now().toString();
    const tsString = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    
    setMessages((prev) => [...prev, { id: userMsgId, sender: "user", text: rawText, timestamp: tsString }]);
    setInput("");
    setLoading(true);

    const action = activeChip ? activeChip.action : "general_chat";
    setActiveChip(null);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: aiMsgId, sender: "ai", text: "", timestamp: tsString }]);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, context: rawText, workspaceId }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Response body is not readable");

      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const chunkText = parsed.choices?.[0]?.delta?.content;
              if (chunkText) {
                fullText += chunkText;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMsgId ? { ...msg, text: fullText } : msg
                  )
                );
              }
            } catch { /* ignore parse errors mid-stream */ }
          }
        }
      }

      // After stream ends, parse action payloads and execute them
      const { cleanText, createTasks, createDocs, createCalendarEvents } = parseAndStripActions(fullText);
      const actionResults: Array<{ type: "task_created" | "doc_created" | "calendar_event_created"; title: string; detail?: string }> = [];

      const taskPromises = createTasks.map(async (task) => {
        try {
          const res = await fetch("/api/ai/create-task", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(task),
          });
          if (res.ok) {
            actionResults.push({ type: "task_created", title: task.title });
          }
        } catch (err) {
          console.error("Failed to create task via AI:", err);
        }
      });

      const calPromises = createCalendarEvents.map(async (event) => {
        try {
          const res = await fetch("/api/ai/create-calendar-event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(event),
          });
          if (res.ok) {
            const detail = event.date
              ? `${event.date}${event.start_time ? ` at ${event.start_time}` : ""}`
              : "";
            actionResults.push({ type: "calendar_event_created", title: event.title, detail });
          }
        } catch (err) {
          console.error("Failed to create event via AI:", err);
        }
      });

      for (const doc of createDocs) {
        try {
          const LS_KEY = "chrona:docs:v1";
          const existing = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
          const now = Date.now();
          existing.unshift({
            id: crypto.randomUUID(),
            title: doc.title,
            content: doc.content ?? "",
            createdAt: now,
            updatedAt: now,
          });
          localStorage.setItem(LS_KEY, JSON.stringify(existing));
          actionResults.push({ type: "doc_created", title: doc.title });
        } catch (err) {
          console.error("Failed to create doc via AI:", err);
        }
      }

      await Promise.all([...taskPromises, ...calPromises]);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, text: cleanText || fullText, actions: actionResults.length > 0 ? actionResults : null }
            : msg
        )
      );
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Service is currently unavailable.";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                text: `Sorry, I encountered an error: ${errMsg}. Please verify that your AI credentials are set up.`,
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // Chips that have a self-contained question auto-fire immediately
  const PRESET_CHIPS = new Set(["Daily standup", "Who's available?", "Overdue tasks", "Summarize workspace", "How to use Chrona", "Analyse workload", "What's blocking us?", "Suggest meeting time"]);

  const selectChip = (chip: ActionChip) => {
    if (PRESET_CHIPS.has(chip.label)) {
      // Auto-send — the placeholder IS the question
      handleSend(chip.placeholder);
    } else {
      setActiveChip(chip);
      setInput("");
    }
  };

  const drawerContent = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[999] cursor-pointer"
          />

          {/* Drawer panel (Premium Light Glassmorphic) */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[rgba(255,255,255,0.45)] backdrop-blur-[24px] border-l border-white/60 shadow-[0_0_80px_rgba(30,45,61,0.25)] z-[1000] flex flex-col text-foreground"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/40 flex items-center justify-between bg-[rgba(255,255,255,0.4)] backdrop-blur-[16px] relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-white/10 pointer-events-none" />
              <div className="relative z-10 flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-white/80 border border-white/60 flex items-center justify-center shadow-sm overflow-hidden">
                  <img
                    src="/nexus-logo.png"
                    alt="Chrona Nexus"
                    className="h-7 w-7 object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[#1E2D3D]">Chrona Nexus</h2>
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-indigo-600/10 border border-indigo-600/20 text-indigo-700 tracking-widest uppercase">
                      PRO
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Agentic workspace intelligence
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="relative z-10 h-8 w-8 rounded-lg hover:bg-black/5 flex items-center justify-center transition-colors cursor-pointer text-[#344B63] hover:text-[#1E2D3D]"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Capability hints */}
            <div className="px-4 py-2.5 bg-white/30 border-b border-white/40 shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
              <p className="text-[10px] text-[#344B63] font-semibold leading-relaxed">
                💡 Try: <em>"Analyse team workload"</em> · <em>"What's blocking us?"</em> · <em>"Create a task: Review Q3 report, due Friday"</em>
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isAI = msg.sender === "ai";
                return (
                  <div key={msg.id} className={`flex gap-2.5 items-start group/msg ${!isAI ? "flex-row-reverse" : ""}`}>
                    <div
                      className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border select-none ${
                        isAI
                          ? "bg-[rgba(255,255,255,0.65)] text-indigo-600 border-white/80 shadow-[0_2px_8px_rgba(100,140,180,0.15)]"
                          : avatarUrl
                            ? "border-white/50 shadow-md bg-white overflow-hidden"
                            : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-white/50 shadow-md"
                      }`}
                    >
                      {isAI ? (
                        <img
                          src="/nexus-logo.png"
                          alt="Nexus"
                          className="h-6 w-6 object-contain opacity-85"
                        />
                      ) : avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="User"
                          className="h-full w-full rounded-xl object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1 max-w-[85%]">
                      {isAI && msg.id === "welcome" && (
                        <div className="flex flex-col items-start mb-2 gap-1.5">
                          <div className="h-14 w-14 rounded-2xl bg-white/85 border border-white/60 flex items-center justify-center shadow-md overflow-hidden animate-fade-up">
                            <img
                              src="/nexus-logo.png"
                              alt="Chrona Nexus"
                              className="h-12 w-12 object-contain"
                            />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 ml-0.5">Chrona Nexus AI</span>
                        </div>
                      )}
                      <div
                        className={`px-4 py-3 text-xs md:text-sm leading-relaxed border break-words whitespace-pre-wrap ${
                          isAI
                            ? "bg-[rgba(255,255,255,0.65)] backdrop-blur-md text-[#1E2D3D] border-white/80 shadow-[0_2px_12px_rgba(100,140,180,0.12),inset_0_1px_0_rgba(255,255,255,0.90)] rounded-2xl rounded-tl-sm"
                            : "bg-[rgba(74,144,212,0.15)] backdrop-blur-md text-[#1E2D3D] border-[rgba(74,144,212,0.3)] shadow-[0_2px_12px_rgba(100,140,180,0.08),inset_0_1px_0_rgba(255,255,255,0.60)] rounded-2xl rounded-tr-sm"
                        }`}
                      >
                        {msg.text ? (
                          renderMarkdown(msg.text)
                        ) : (
                          <div className="flex gap-1.5 items-center justify-center py-1.5 px-1.5">
                            <div className="cupertino-dot bg-indigo-400" />
                            <div className="cupertino-dot bg-violet-400" />
                            <div className="cupertino-dot bg-pink-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Hover-triggered timestamp */}
                      <span className="text-[9px] text-muted-foreground/0 group-hover/msg:text-muted-foreground/60 transition-opacity select-none px-1.5 mt-0.5">
                        {msg.timestamp}
                      </span>
                      
                      {/* Action confirmation cards */}
                      {msg.actions && msg.actions.map((action, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 rounded-xl bg-[rgba(52,201,138,0.10)] border border-[rgba(52,201,138,0.30)] px-3 py-2 text-xs text-emerald-700 mt-1"
                        >
                          {action.type === "task_created" ? (
                            <><PlusCircle className="h-3.5 w-3.5 shrink-0" /> <span>Task created: <strong>{action.title}</strong> — <a href="/tasks" className="underline underline-offset-2">View tasks</a></span></>
                          ) : action.type === "calendar_event_created" ? (
                            <><CheckCircle className="h-3.5 w-3.5 shrink-0" /> <span>📅 Event added: <strong>{action.title}</strong>{action.detail ? ` on ${action.detail}` : ""} — <a href="/calendar" className="underline underline-offset-2">View calendar</a></span></>
                          ) : (
                            <><CheckCircle className="h-3.5 w-3.5 shrink-0" /> Doc created: <strong>{action.title}</strong></>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/50 bg-[rgba(255,255,255,0.4)] backdrop-blur-[24px] space-y-3 shrink-0">
              {/* Active chip banner */}
              {activeChip && (
                <div className="flex items-center justify-between bg-[rgba(255,255,255,0.6)] border border-white/80 rounded-xl px-3 py-2 text-xs shadow-sm">
                  <div className="flex items-center gap-1.5 text-indigo-600 font-bold">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Mode: {activeChip.label}</span>
                  </div>
                  <button
                    onClick={() => setActiveChip(null)}
                    className="text-[#344B63] hover:text-[#1E2D3D] cursor-pointer bg-white/50 hover:bg-white rounded-md p-0.5 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Action chips */}
              {!activeChip && !loading && (
                <div className="flex overflow-x-auto gap-2 pt-1 pb-2 scrollbar-hide snap-x">
                  {ACTION_CHIPS.map((chip) => (
                    <button
                      key={chip.action + chip.label}
                      type="button"
                      onClick={() => selectChip(chip)}
                      className="shrink-0 snap-start px-3 py-2 rounded-xl border border-white/65 bg-[rgba(255,255,255,0.60)] backdrop-blur-md hover:bg-white hover:border-white/80 text-xs font-semibold text-[#344B63] hover:text-[#1E2D3D] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-[0_2px_8px_rgba(100,140,180,0.08),inset_0_1px_0_rgba(255,255,255,0.90)]"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2 items-end relative"
              >
                <div className="relative flex-1">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={
                      activeChip ? activeChip.placeholder : "Ask Chrona Nexus anything, or say 'create a task: …'"
                    }
                    className="w-full rounded-2xl border border-white/80 bg-white/60 hover:bg-white/70 focus:bg-white/90 backdrop-blur-[12px] pl-4 pr-12 py-3.5 text-sm text-[#1E2D3D] placeholder:text-[#40566E] resize-none max-h-24 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-[inset_0_2px_4px_rgba(100,140,180,0.06)] transition-all"
                  />
                  <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1 text-[9px] text-[#40566E] font-semibold select-none">
                    <span className="bg-white/80 px-1.5 py-0.5 rounded border border-white/90 shadow-sm flex items-center gap-0.5 backdrop-blur-sm">
                      Enter
                      <CornerDownLeft className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || (!input.trim() && !activeChip)}
                  className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white flex items-center justify-center shadow-[0_2px_10px_rgba(99,102,241,0.4)] shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 border border-white/40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(drawerContent, document.body);
}
