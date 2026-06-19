"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Bot, User, CornerDownLeft, CheckCircle, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  action?: { type: "task_created" | "doc_created"; title: string } | null;
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
  createTask: { title: string; description?: string; priority?: string; due_date?: string | null } | null;
  createDoc: { title: string; content: string } | null;
} {
  let cleanText = text;
  let createTask = null;
  let createDoc = null;

  const taskMatch = text.match(/\[CREATE_TASK_ACTION\]\s*([\s\S]*?)\s*\[\/CREATE_TASK_ACTION\]/);
  if (taskMatch) {
    try {
      createTask = JSON.parse(taskMatch[1]);
    } catch { /* ignore */ }
    cleanText = cleanText.replace(taskMatch[0], "").trim();
  }

  const docMatch = text.match(/\[CREATE_DOC_ACTION\]\s*([\s\S]*?)\s*\[\/CREATE_DOC_ACTION\]/);
  if (docMatch) {
    try {
      createDoc = JSON.parse(docMatch[1]);
    } catch { /* ignore */ }
    cleanText = cleanText.replace(docMatch[0], "").trim();
  }

  return { cleanText, createTask, createDoc };
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
      text: "Hello! I'm **Chrona Nexus** ✨ — your agentic workspace intelligence.\n\nI can:\n• **Answer questions** about your tasks, team, and workspace\n• **Analyse workload** and surface blockers across the team\n• **Create tasks** — just say *'Create a task: Review Q3 report, due Friday'*\n• **Draft descriptions**, suggest next steps, and summarise activity\n\nTap a chip below or ask me anything!",
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [activeChip, setActiveChip] = useState<ActionChip | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      const { cleanText, createTask, createDoc } = parseAndStripActions(fullText);
      let actionResult: Message["action"] = null;

      if (createTask) {
        try {
          const res = await fetch("/api/ai/create-task", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(createTask),
          });
          if (res.ok) {
            actionResult = { type: "task_created", title: createTask.title };
          }
        } catch { /* fire and forget */ }
      }

      if (createDoc) {
        // Save to localStorage (docs page uses localStorage)
        try {
          const LS_KEY = "chrona:docs:v1";
          const existing = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
          const now = Date.now();
          existing.unshift({
            id: crypto.randomUUID(),
            title: createDoc.title,
            content: createDoc.content ?? "",
            createdAt: now,
            updatedAt: now,
          });
          localStorage.setItem(LS_KEY, JSON.stringify(existing));
          actionResult = { type: "doc_created", title: createDoc.title };
        } catch { /* ignore */ }
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, text: cleanText || fullText, action: actionResult }
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

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 cursor-pointer"
          />

          {/* Drawer panel (Premium Light Glassmorphic) */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white/95 border-l border-border shadow-2xl z-50 flex flex-col backdrop-blur-xl text-foreground"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 text-white relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-black/10 pointer-events-none" />
              <div className="relative z-10 flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-white/20 text-white border border-white/30 flex items-center justify-center shadow-md">
                  <Sparkles className="h-4.5 w-4.5 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white">Chrona Nexus</h2>
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white tracking-widest">
                      PRO
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-bold flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Agentic workspace intelligence
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="relative z-10 h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer text-slate-100 hover:text-white"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Capability hints */}
            <div className="px-4 py-2.5 bg-violet-50/40 border-b border-border shrink-0">
              <p className="text-[10px] text-violet-700 font-semibold leading-relaxed">
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
                          ? "bg-indigo-50 text-indigo-600 border-indigo-100" 
                          : "bg-primary text-white border-indigo-500/10"
                      }`}
                    >
                      {isAI ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    
                    <div className="flex flex-col gap-1 max-w-[78%]">
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-xs md:text-sm leading-relaxed border ${
                          isAI
                            ? "bg-slate-50 text-slate-800 border-border border-l-4 border-l-indigo-500"
                            : "bg-gradient-to-br from-indigo-600 to-violet-600 text-white border-indigo-500/20 shadow-md shadow-indigo-600/5"
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
                      
                      {/* Action confirmation card */}
                      {msg.action && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-600 mt-1"
                        >
                          {msg.action.type === "task_created" ? (
                            <><PlusCircle className="h-3.5 w-3.5 shrink-0" /> Task created: <strong>{msg.action.title}</strong></>
                          ) : (
                            <><CheckCircle className="h-3.5 w-3.5 shrink-0" /> Doc created: <strong>{msg.action.title}</strong></>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-slate-50 space-y-3 shrink-0">
              {/* Active chip banner */}
              {activeChip && (
                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-150 rounded-xl px-3 py-2 text-xs">
                  <div className="flex items-center gap-1.5 text-indigo-600 font-bold">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Mode: {activeChip.label}</span>
                  </div>
                  <button
                    onClick={() => setActiveChip(null)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Action chips */}
              {!activeChip && !loading && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {ACTION_CHIPS.map((chip) => (
                    <button
                      key={chip.action + chip.label}
                      type="button"
                      onClick={() => selectChip(chip)}
                      className="px-2.5 py-1.5 rounded-xl border border-border bg-white hover:border-primary/50 text-xs font-semibold text-slate-600 hover:text-primary transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
                    >
                      <Sparkles className="h-3 w-3 text-indigo-500" />
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
                    className="w-full rounded-2xl border border-border bg-white pl-4 pr-12 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none max-h-24 min-h-[48px] focus:outline-none focus:ring-1 focus:ring-primary/50 shadow-inner"
                  />
                  <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1 text-[9px] text-muted-foreground/60 font-semibold select-none">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-border flex items-center gap-0.5">
                      Enter
                      <CornerDownLeft className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || (!input.trim() && !activeChip)}
                  className="h-11 w-11 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 border border-indigo-500/20"
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
}
