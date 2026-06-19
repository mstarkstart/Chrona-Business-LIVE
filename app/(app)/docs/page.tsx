"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Plus, Trash2, BookOpen, Pencil, Save, X,
  LayoutList, StickyNote, Pin, Sparkles,
  Bold, Italic, Code, Heading1, Heading2, List, Eye, EyeOff, Link2,
} from "lucide-react";

// ─── Simple markdown renderer ──────────────────────────────────────────────────

function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-4 mb-1 text-foreground">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 class="text-lg font-bold mt-5 mb-1.5 text-foreground">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 class="text-xl font-bold mt-6 mb-2 text-foreground">$1</h1>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-[12px] font-mono text-indigo-700">$1</code>')
    // Bullet lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc leading-relaxed">$1</li>')
    .replace(/^• (.+)$/gm, '<li class="ml-4 list-disc leading-relaxed">$1</li>')
    // HR
    .replace(/^---$/gm, '<hr class="my-4 border-border" />')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-indigo-600 underline" target="_blank">$1</a>')
    // Line breaks → paragraphs
    .split('\n\n').map(p => p.trim() ? `<p class="mb-3 leading-relaxed">${p.replace(/\n/g, '<br/>')}</p>` : '').join('')
    // Wrap lone li items (avoid /s dotAll flag which requires ES2018+)
    .replace(/(<li[^>]*>[\s\S]*?<\/li>)/gm, '<ul class="my-2 space-y-0.5">$1</ul>');
}

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Doc {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface Sticky {
  id: string;
  content: string;
  color: string;
  rotation: number;
  createdAt: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const DOC_KEY    = "chrona:docs:v1";
const STICKY_KEY = "chrona:stickies:v1";

const STICKY_COLORS = [
  { bg: "#fef9c3", border: "#fde047", label: "Yellow" },
  { bg: "#dcfce7", border: "#86efac", label: "Green"  },
  { bg: "#fce7f3", border: "#f9a8d4", label: "Pink"   },
  { bg: "#dbeafe", border: "#93c5fd", label: "Blue"   },
  { bg: "#ffedd5", border: "#fdba74", label: "Orange" },
  { bg: "#f3e8ff", border: "#d8b4fe", label: "Purple" },
];

// ─── Storage helpers ─────────────────────────────────────────────────────────────

function load<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) ?? "[]") as T[]; }
  catch { return []; }
}
function save<T>(key: string, data: T[]) { localStorage.setItem(key, JSON.stringify(data)); }

function newDoc(title: string): Doc {
  const now = Date.now();
  return { id: crypto.randomUUID(), title: title.trim() || "Untitled", content: "", createdAt: now, updatedAt: now };
}

function newSticky(): Sticky {
  const color = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
  const rotation = (Math.random() * 6 - 3); // -3 to +3 degrees
  return { id: crypto.randomUUID(), content: "", color: color.bg, rotation, createdAt: Date.now() };
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Sticky Note Component ────────────────────────────────────────────────────────

function StickyNoteCard({
  sticky,
  onUpdate,
  onDelete,
}: {
  sticky: Sticky;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(sticky.content);
  const [hovered, setHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const colorEntry = STICKY_COLORS.find((c) => c.bg === sticky.color) ?? STICKY_COLORS[0];

  function handleBlur() {
    setEditing(false);
    onUpdate(sticky.id, content);
  }

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, rotate: sticky.rotation }}
      animate={{
        opacity: 1,
        scale: hovered ? 1.04 : 1,
        rotate: hovered ? 0 : sticky.rotation,
        y: hovered ? -6 : 0,
      }}
      exit={{ opacity: 0, scale: 0.7, rotate: sticky.rotation * 2 }}
      transition={{ type: "spring", damping: 18, stiffness: 260 }}
      className="relative group cursor-pointer"
      style={{ transformOrigin: "top center" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !editing && setEditing(true)}
    >
      {/* Pin */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 h-5 w-5 rounded-full flex items-center justify-center shadow-md"
        style={{ background: colorEntry.border }}
      >
        <div className="h-2 w-2 rounded-full bg-white/70" />
      </div>

      {/* Note body */}
      <div
        className="relative w-[170px] min-h-[160px] rounded-sm p-4 pt-5 shadow-[3px_4px_12px_rgba(0,0,0,0.15)] flex flex-col"
        style={{
          background: `linear-gradient(135deg, ${sticky.color} 0%, ${sticky.color}ee 100%)`,
          border: `1px solid ${colorEntry.border}88`,
        }}
      >
        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(sticky.id); }}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded-full bg-black/10 hover:bg-red-400/30 flex items-center justify-center"
        >
          <X className="h-3 w-3 text-gray-600 hover:text-red-600" />
        </button>

        {/* Content */}
        {editing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
            placeholder="Write a note…"
            className="flex-1 w-full resize-none bg-transparent border-none outline-none text-xs text-gray-700 leading-relaxed placeholder:text-gray-400/70 font-medium"
            style={{ fontFamily: "'Segoe UI', sans-serif" }}
          />
        ) : (
          <p className="text-xs text-gray-700 leading-relaxed font-medium flex-1 break-words whitespace-pre-wrap min-h-[80px]">
            {content || <span className="text-gray-400/60 italic">Click to write…</span>}
          </p>
        )}

        {/* Bottom fold effect */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6"
          style={{
            background: `linear-gradient(225deg, ${colorEntry.border}66 50%, transparent 50%)`,
            borderTopLeftRadius: "4px",
          }}
        />

        {/* Date */}
        <p className="text-[9px] text-gray-400/80 mt-2 font-medium">{fmtDate(sticky.createdAt)}</p>
      </div>
    </motion.div>
  );
}

// ─── Docs Sidebar ────────────────────────────────────────────────────────────────

function DocsSidebar({
  docs, activeId, onSelect, onNew, onDelete,
}: {
  docs: Doc[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className="w-64 shrink-0 flex flex-col border-r border-border bg-card/80 backdrop-blur-sm h-full">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center">
            <LayoutList className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <span className="text-sm font-bold text-foreground">Workspace Docs</span>
        </div>
        <button
          onClick={onNew}
          title="New doc"
          className="h-7 w-7 rounded-lg hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {docs.length === 0 ? (
          <div className="px-2 py-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No docs yet.</p>
            <button onClick={onNew} className="mt-2 text-xs text-indigo-600 hover:underline font-semibold">
              Create your first doc
            </button>
          </div>
        ) : (
          <AnimatePresence>
            {docs.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(doc.id)}
                onKeyDown={(e) => e.key === "Enter" && onSelect(doc.id)}
                className={`group w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition-all cursor-pointer ${
                  activeId === doc.id
                    ? "bg-indigo-100 text-indigo-800 shadow-sm"
                    : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                  <span className="text-sm truncate font-medium">{doc.title}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-all shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </nav>
    </aside>
  );
}

// ─── Doc Editor ──────────────────────────────────────────────────────────────────

const FORMAT_ACTIONS = [
  { icon: <Heading1 className="h-3.5 w-3.5" />, label: "H1",   wrap: "# ",   block: true  },
  { icon: <Heading2 className="h-3.5 w-3.5" />, label: "H2",   wrap: "## ",  block: true  },
  { icon: <Bold      className="h-3.5 w-3.5" />, label: "Bold", wrap: "**",   block: false },
  { icon: <Italic    className="h-3.5 w-3.5" />, label: "Italic",wrap: "*",   block: false },
  { icon: <Code      className="h-3.5 w-3.5" />, label: "Code", wrap: "`",    block: false },
  { icon: <List      className="h-3.5 w-3.5" />, label: "List", wrap: "- ",   block: true  },
  { icon: <Link2     className="h-3.5 w-3.5" />, label: "Link", wrap: "[text](url)", block: false, insert: true },
];

function DocEditor({ doc, onSave, onClose }: { doc: Doc; onSave: (updated: Partial<Doc>) => void; onClose: () => void }) {
  const [title,   setTitle]   = useState(doc.title);
  const [content, setContent] = useState(doc.content);
  const [saved,   setSaved]   = useState(false);
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerAutoSave(t: string, c: string) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onSave({ title: t, content: c });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 1200);
  }

  // Insert formatting at cursor position
  function applyFormat(action: typeof FORMAT_ACTIONS[number]) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = content.slice(start, end);
    let newContent = content;
    let newCursor  = end;

    if (action.insert) {
      // Insert template at cursor
      newContent = content.slice(0, start) + action.wrap + content.slice(end);
      newCursor  = start + action.wrap.length;
    } else if (action.block) {
      // Prefix current line
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      newContent = content.slice(0, lineStart) + action.wrap + content.slice(lineStart);
      newCursor  = end + action.wrap.length;
    } else {
      // Wrap selection
      newContent = content.slice(0, start) + action.wrap + sel + action.wrap + content.slice(end);
      newCursor  = end + action.wrap.length * 2;
    }

    setContent(newContent);
    triggerAutoSave(title, newContent);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(newCursor, newCursor);
    }, 0);
  }

  // Keyboard shortcuts
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); applyFormat(FORMAT_ACTIONS[2]); }
      if (e.key === 'i') { e.preventDefault(); applyFormat(FORMAT_ACTIONS[3]); }
      if (e.key === 'e') { e.preventDefault(); applyFormat(FORMAT_ACTIONS[4]); }
      if (e.key === 's') { e.preventDefault(); onSave({ title, content }); setSaved(true); setTimeout(() => setSaved(false), 1500); }
    }
  }

  const words    = content.split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(words / 200));

  return (
    <motion.div
      key={doc.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full"
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <Pencil className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); triggerAutoSave(e.target.value, content); }}
            className="flex-1 min-w-0 text-lg font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
            placeholder="Doc title…"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AnimatePresence>
            {saved && (
              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Save className="h-3 w-3" /> Saved
              </motion.span>
            )}
          </AnimatePresence>
          {/* Preview toggle */}
          <button
            onClick={() => setPreview(!preview)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              preview ? "bg-indigo-100 text-indigo-700" : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {preview ? "Edit" : "Preview"}
          </button>
          <button
            onClick={() => { onSave({ title, content }); setSaved(true); setTimeout(() => setSaved(false), 1500); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-sm"
          >
            <Save className="h-3.5 w-3.5" /> Save
          </button>
          <button onClick={onClose} className="h-8 w-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Formatting toolbar — only in edit mode */}
      {!preview && (
        <div className="flex items-center gap-1 px-6 py-2 border-b border-border bg-muted/20 flex-wrap">
          {FORMAT_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => applyFormat(action)}
              title={action.label}
              className="h-7 px-2 rounded-lg hover:bg-indigo-100 hover:text-indigo-700 text-muted-foreground transition-colors flex items-center justify-center text-xs font-bold"
            >
              {action.icon}
            </button>
          ))}
          <span className="mx-1 text-border">|</span>
          <span className="text-[10px] text-muted-foreground/60 font-mono">Ctrl+B bold · Ctrl+I italic · Ctrl+E code · Ctrl+S save</span>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {preview ? (
          <div
            className="prose prose-sm max-w-none text-foreground text-[15px] leading-[1.8]"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) || '<p class="text-muted-foreground italic">Nothing to preview yet.</p>' }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { setContent(e.target.value); triggerAutoSave(title, e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder={"Start writing your doc…\n\nTips: Use # Heading, **bold**, *italic*, `code`, - list item"}
            className="w-full h-full resize-none bg-transparent border-none outline-none text-foreground leading-relaxed placeholder:text-muted-foreground/40 min-h-[400px]"
            style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "15px", lineHeight: "1.8" }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-2.5 border-t border-border text-xs text-muted-foreground flex items-center gap-4 bg-muted/20">
        <span>Created {fmtDate(doc.createdAt)}</span>
        <span>Updated {fmtDate(doc.updatedAt)}</span>
        <span className="ml-auto">{words} words · {readTime} min read · {content.length} chars</span>
      </div>
    </motion.div>
  );
}

// ─── Welcome / Home Pane ─────────────────────────────────────────────────────────

function HomePane({
  onNew,
  stickies,
  onAddSticky,
  onUpdateSticky,
  onDeleteSticky,
  docs,
  onSelectDoc,
}: {
  onNew: () => void;
  stickies: Sticky[];
  onAddSticky: () => void;
  onUpdateSticky: (id: string, content: string) => void;
  onDeleteSticky: (id: string) => void;
  docs: Doc[];
  onSelectDoc: (id: string) => void;
}) {
  return (
    <div className="h-full overflow-y-auto p-8 space-y-10 dashboard-bg">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Workspace Docs</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Create and share knowledge across your team</p>
          </div>
        </div>
        <button
          onClick={onNew}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-500/20"
        >
          <Plus className="h-4 w-4" /> New Doc
        </button>
      </motion.div>

      {/* ── Sticky Notes Board ── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4.5 w-4.5 text-amber-500" />
            <h2 className="text-sm font-bold text-foreground">Quick Notes</h2>
            <span className="text-xs text-muted-foreground">— pin anything to the board</span>
          </div>
          <button
            onClick={onAddSticky}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add sticky
          </button>
        </div>

        {/* Corkboard */}
        <div
          className="relative w-full min-h-[220px] rounded-3xl p-6 border border-amber-200/60"
          style={{
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a20 50%, #fef9c3 100%)",
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(251,191,36,0.08) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(245,158,11,0.06) 0%, transparent 50%),
              url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d97706' fill-opacity='0.04'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
            `,
          }}
        >
          {stickies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Pin className="h-8 w-8 text-amber-300 mb-2" />
              <p className="text-sm font-semibold text-amber-700/60">No sticky notes yet</p>
              <button onClick={onAddSticky} className="mt-2 text-xs text-amber-600 font-bold hover:underline">Add your first note →</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-6 items-start">
              <AnimatePresence>
                {stickies.map((s) => (
                  <StickyNoteCard
                    key={s.id}
                    sticky={s}
                    onUpdate={onUpdateSticky}
                    onDelete={onDeleteSticky}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Recent Docs ── */}
      {docs.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-foreground">Recent Docs</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {docs.slice(0, 6).map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => onSelectDoc(doc.id)}
                  className="glass-card rounded-2xl p-4 cursor-pointer card-hover group"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                      <FileText className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{doc.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {doc.content.slice(0, 60) || "Empty doc"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1.5">{fmtDate(doc.updatedAt)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* New doc card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={onNew}
              className="rounded-2xl border border-dashed border-indigo-200 p-4 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition-all group flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
              <span className="text-sm font-semibold text-indigo-400 group-hover:text-indigo-600 transition-colors">New Doc</span>
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* ── Coming soon ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-violet-50/40 p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-bold text-indigo-700">Coming soon — Block Editor</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {["Rich block editor (Tiptap)", "Headings, lists, code blocks", "Real-time collaboration", "Synced with version history"].map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-indigo-700/80">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </motion.div>

    </div>
  );
}

// ─── New Doc Modal ────────────────────────────────────────────────────────────────

function NewDocModal({ onConfirm, onCancel }: { onConfirm: (title: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 12 }}
        className="w-full max-w-sm rounded-2xl bg-white border border-border shadow-2xl p-6"
      >
        <h3 className="text-base font-bold text-foreground mb-4">New Doc</h3>
        <form onSubmit={(e) => { e.preventDefault(); onConfirm(title); }} className="space-y-4">
          <input
            ref={ref}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Doc title…"
            className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-bold hover:bg-indigo-700 transition-colors">
              Create
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [docs,      setDocs]      = useState<Doc[]>([]);
  const [stickies,  setStickies]  = useState<Sticky[]>([]);
  const [activeId,  setActiveId]  = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [hydrated,  setHydrated]  = useState(false);

  useEffect(() => {
    setDocs(load<Doc>(DOC_KEY));
    setStickies(load<Sticky>(STICKY_KEY));
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) save(DOC_KEY, docs); }, [docs, hydrated]);
  useEffect(() => { if (hydrated) save(STICKY_KEY, stickies); }, [stickies, hydrated]);

  const activeDoc = docs.find((d) => d.id === activeId) ?? null;

  const handleAddSticky = useCallback(() => {
    setStickies((prev) => [newSticky(), ...prev]);
  }, []);

  const handleUpdateSticky = useCallback((id: string, content: string) => {
    setStickies((prev) => prev.map((s) => s.id === id ? { ...s, content } : s));
  }, []);

  const handleDeleteSticky = useCallback((id: string) => {
    setStickies((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleConfirmNew = useCallback((title: string) => {
    const doc = newDoc(title);
    setDocs((prev) => [doc, ...prev]);
    setActiveId(doc.id);
    setShowModal(false);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (activeId === id) setActiveId(null);
  }, [activeId]);

  const handleSave = useCallback((updated: Partial<Doc>) => {
    if (!activeId) return;
    setDocs((prev) => prev.map((d) => d.id === activeId ? { ...d, ...updated, updatedAt: Date.now() } : d));
  }, [activeId]);

  if (!hydrated) return null;

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <DocsSidebar
        docs={docs}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={() => setShowModal(true)}
        onDelete={handleDelete}
      />

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeDoc ? (
            <DocEditor key={activeDoc.id} doc={activeDoc} onSave={handleSave} onClose={() => setActiveId(null)} />
          ) : (
            <HomePane
              key="home"
              onNew={() => setShowModal(true)}
              stickies={stickies}
              onAddSticky={handleAddSticky}
              onUpdateSticky={handleUpdateSticky}
              onDeleteSticky={handleDeleteSticky}
              docs={docs}
              onSelectDoc={setActiveId}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showModal && (
          <NewDocModal onConfirm={handleConfirmNew} onCancel={() => setShowModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
