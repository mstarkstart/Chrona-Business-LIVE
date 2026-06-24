"use client";

import {
  DndContext,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { moveTask, createTaskInProject } from "@/lib/tasks/mutations";
import type { Tables } from "@/lib/supabase/types";
import { Calendar, CheckCircle2, X, AlertCircle, Clock, CheckCircle, HelpCircle } from "lucide-react";

type Task = Tables<"tasks">;

interface Column {
  id: string;
  label: string;
  status: Task["status"];
  borderColor: string;
  headerColor: string;
  dotColor: string;
}

const COLUMNS: Column[] = [
  { id: "backlog", label: "Backlog", status: "pending", borderColor: "border-l-zinc-300", headerColor: "text-zinc-500", dotColor: "#9ca3af" },
  { id: "in_progress", label: "In Progress", status: "in_progress", borderColor: "border-l-indigo-500", headerColor: "text-indigo-600", dotColor: "#6366f1" },
  { id: "in_review", label: "In Review", status: "awaiting_approval", borderColor: "border-l-amber-500", headerColor: "text-amber-600", dotColor: "#fbbf24" },
  { id: "done", label: "Done", status: "completed", borderColor: "border-l-emerald-500", headerColor: "text-emerald-600", dotColor: "#34d399" },
];

const PRIORITY_DOT: Record<Task["priority"], string> = {
  urgent: "#fb7185", // rose
  high: "#fb923c", // orange
  normal: "#6366f1", // indigo
  low: "#9ca3af", // zinc
};

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

const PRIORITY_BORDER: Record<Task["priority"], string> = {
  urgent: "border-l-red-500/80",
  high: "border-l-orange-400/80",
  normal: "border-l-indigo-400/80",
  low: "border-l-zinc-350/80",
};

const PRIORITY_TEXT: Record<Task["priority"], string> = {
  urgent: "text-red-600 bg-red-50 border-red-200",
  high: "text-orange-600 bg-orange-50 border-orange-200",
  normal: "text-indigo-600 bg-indigo-50 border-indigo-200",
  low: "text-zinc-600 bg-zinc-50 border-zinc-200",
};

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function taskKey(id: string) {
  return "TK-" + id.slice(0, 4).toUpperCase();
}

// Full task detail slide-over modal (Light glass redesign)
function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all duration-300" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative z-10 h-full w-full max-w-[500px] bg-white/95 border-l border-border shadow-2xl flex flex-col animate-fade-up backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="task-key shrink-0 text-xs text-muted-foreground">{taskKey(task.id)}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_TEXT[task.priority]}`}>
              {PRIORITY_LABEL[task.priority]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold leading-snug text-foreground">{task.title}</h2>
            {task.description && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed bg-slate-50 p-4 rounded-xl border border-border">
                {task.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <Detail label="Status" value={task.status.replace(/_/g, " ")} />
            <Detail label="Priority" value={PRIORITY_LABEL[task.priority]} />
            <Detail label="Due date" value={task.due_date ? formatDate(task.due_date)! : "—"} />
            <Detail label="Created" value={formatDate(task.created_at)} />
          </div>

          {task.assigned_to && (
            <div className="flex items-center gap-2.5 pt-4 border-t border-border">
              <div className="h-8.5 w-8.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-sm font-bold shadow-sm">
                {task.assigned_to.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Assignee</p>
                <p className="text-xs font-semibold text-foreground">Assigned Teammate</p>
              </div>
            </div>
          )}

          {task.labels && (task.labels as string[]).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Labels</p>
              <div className="flex flex-wrap gap-1.5">
                {(task.labels as string[]).map((l) => (
                  <span key={l} className="px-2 py-0.5 rounded-full bg-slate-50 border border-border text-slate-600 text-xs font-medium">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-end">
            <Link
              href={`/tasks/${task.id}`}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View full details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-0.5 bg-slate-50 p-2.5 rounded-lg border border-border">
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className="font-semibold capitalize text-foreground mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

// JIRA-style task card
function TaskCard({ task, isDragging, onClick }: { task: Task; isDragging?: boolean; onClick?: () => void }) {
  const isUrgent = task.priority === "urgent";
  const isHigh = task.priority === "high";
  const glowClass = isUrgent ? "priority-glow-urgent" : isHigh ? "priority-glow-high" : "";

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border bg-card border-border cursor-pointer select-none transition-all duration-200 border-l-4 ${PRIORITY_BORDER[task.priority]} ${glowClass} hover:bg-slate-50/50 hover:border-indigo-200 ${isDragging
          ? "opacity-45 shadow-xl ring-2 ring-indigo-500/30 border-indigo-300 scale-[0.97]"
          : "shadow-sm hover:shadow-md"
        }`}
    >
      {/* Top row: key + priority badge */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-0">
        <span className="task-key text-[10px] font-mono font-bold tracking-wider opacity-60">{taskKey(task.id)}</span>
        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${PRIORITY_TEXT[task.priority]}`}>
          {PRIORITY_LABEL[task.priority]}
        </span>
      </div>

      {/* Title */}
      <div className="px-3.5 pt-2 pb-3.5">
        <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">{task.title}</p>

        {/* Bottom row: due date + assignee */}
        <div className="mt-3 flex items-center justify-between">
          {task.due_date ? (
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
              <Calendar className="h-3 w-3 text-muted-foreground/60" />
              {formatDate(task.due_date)}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/45 italic">No deadline</span>
          )}

          {(task as any).assignee ? (
            <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-extrabold shadow-sm select-none" title={`${(task as any).assignee.first_name} ${(task as any).assignee.last_name}`}>
              {(task as any).assignee.first_name[0]}{(task as any).assignee.last_name[0]}
            </span>
          ) : task.assigned_to ? (
            <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-extrabold shadow-sm select-none">
              {task.assigned_to.slice(0, 2).toUpperCase()}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SortableTaskCard({
  task,
  onCardClick,
  canDrag = true,
}: {
  task: Task;
  onCardClick: (t: Task) => void;
  canDrag?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 150ms ease",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(canDrag ? listeners : {})}
      className={canDrag ? "" : "cursor-default"}
    >
      <TaskCard task={task} isDragging={isDragging} onClick={() => onCardClick(task)} />
    </div>
  );
}

interface AddTaskFormProps {
  status: Task["status"];
  workspaceId: string;
  projectId: string | null | undefined;
  onAdded: (task: Task) => void;
}

function AddTaskForm({ status, workspaceId, projectId, onAdded }: AddTaskFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const task = await createTaskInProject(workspaceId, projectId, title.trim(), status);
      if (task) onAdded(task as Task);
      setTitle("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-2.5 rounded-xl border border-dashed border-border py-2.5 text-xs text-muted-foreground hover:border-primary/40 hover:bg-slate-50 hover:text-foreground transition-all font-semibold cursor-pointer duration-200 active:scale-95"
      >
        + Add task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2.5 space-y-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title…"
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 shadow-inner"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors cursor-pointer active:scale-95"
        >
          {pending ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setTitle(""); }}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-all cursor-pointer active:scale-95"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function BoardColumn({
  col,
  colTasks,
  workspaceId,
  projectId,
  onAdded,
  onCardClick,
  canDragFn,
}: {
  col: Column;
  colTasks: Task[];
  workspaceId: string;
  projectId: string | null | undefined;
  onAdded: (task: Task) => void;
  onCardClick: (t: Task) => void;
  canDragFn: (task: Task) => boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status });
  const colTaskIds = colTasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={`w-full rounded-2xl border flex flex-col border-l-4 transition-all duration-200 ${col.borderColor} ${isOver
          ? "bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-500/5 shadow-inner"
          : "bg-card border-border"
        }`}
    >
      {/* Column header */}
      <div className="px-4 py-3.5 flex items-center justify-between border-b border-border bg-slate-50/50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span
            className="status-spark h-2.5 w-2.5 rounded-full"
            style={{ background: col.dotColor, ["--spark-color" as string]: col.dotColor }}
          />
          <span className={`text-[10px] font-bold tracking-wider uppercase ${col.headerColor}`}>{col.label}</span>
        </div>
        <span className="text-[10px] text-slate-600 bg-slate-100 rounded-full px-2 py-0.5 border border-border font-extrabold">
          {colTasks.length}
        </span>
      </div>

      {/* Cards container */}
      <div className="px-3.5 py-3.5 flex-1 space-y-2.5 overflow-y-auto min-h-[400px]">
        <SortableContext items={colTaskIds} strategy={verticalListSortingStrategy}>
          {colTasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onCardClick={onCardClick} canDrag={canDragFn(task)} />
          ))}
        </SortableContext>

        {colTasks.length === 0 && (
          <div
            className={`flex flex-col items-center justify-center h-24 rounded-xl border border-dashed text-xs text-muted-foreground transition-all duration-200 ${isOver ? "border-indigo-400 text-indigo-600 bg-indigo-50/30" : "border-border"
              }`}
          >
            <CheckCircle2 className={`h-5 w-5 mb-1.5 ${isOver ? "text-indigo-600" : "text-muted-foreground/30"}`} />
            <span>Empty</span>
          </div>
        )}

        <AddTaskForm status={col.status} workspaceId={workspaceId} projectId={projectId} onAdded={onAdded} />
      </div>
    </div>
  );
}

interface ProjectBoardProps {
  tasks: Task[];
  workspaceId: string;
  projectId?: string | null | undefined;
  currentUserId?: string;
  role?: string;
}

export function ProjectBoard({ tasks: initialTasks, workspaceId, projectId, currentUserId, role = "member" }: ProjectBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => { 
    setTasks([...initialTasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))); 
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  function tasksForStatus(status: Task["status"]) {
    return tasks.filter((t) => t.status === status);
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    // Resolve target status from column droppable or sibling card
    let targetStatus: Task["status"] | undefined;
    const colMatch = COLUMNS.find((c) => c.id === over.id || c.status === over.id);
    if (colMatch) {
      targetStatus = colMatch.status;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      targetStatus = overTask?.status;
    }
    if (!targetStatus || targetStatus === draggedTask.status) return;

    // Move the dragged task into the new column optimistically
    setTasks((prev) => {
      const without = prev.filter((t) => t.id !== draggedTask.id);
      const overIndex = without.findIndex((t) => t.id === over.id);
      const insertAt = overIndex >= 0 ? overIndex : without.filter((t) => t.status === targetStatus).length;
      const updated = { ...draggedTask, status: targetStatus as Task["status"] };
      const result = [...without];
      result.splice(insertAt, 0, updated);
      return result;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    // At drop time, use the current (already-moved) status from state
    const targetStatus = draggedTask.status;
    const targetTasks = tasks.filter((t) => t.status === targetStatus && t.id !== active.id);
    const overIndex = targetTasks.findIndex((t) => t.id === over.id);
    const newPosition = overIndex >= 0 ? overIndex : targetTasks.length;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggedTask.id ? { ...t, position: newPosition } : t
      )
    );

    startTransition(async () => {
      await moveTask(draggedTask.id, targetStatus, newPosition);
    });
  }

  function handleTaskAdded(task: Task) {
    setTasks((prev) => [...prev, task]);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Fullscreen Board Grid without horizontal scrollbar */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-4 min-h-[600px] w-full">
          {COLUMNS.map((col) => (
            <BoardColumn
              key={col.id}
              col={col}
              colTasks={tasksForStatus(col.status)}
              workspaceId={workspaceId}
              projectId={projectId}
              onAdded={handleTaskAdded}
              onCardClick={(t) => setSelectedTask(t)}
              canDragFn={(t) =>
                role === "member"
                  ? t.assigned_to === currentUserId
                  : true
              }
            />
          ))}
        </div>

        <DragOverlay
          modifiers={[restrictToWindowEdges]}
          dropAnimation={{ duration: 180, easing: "cubic-bezier(0.16,1,0.3,1)" }}
        >
          {activeTask ? (
            <div style={{ cursor: "grabbing" }}>
              <TaskCard task={activeTask} isDragging={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task detail slide-over modal */}
      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </>
  );
}
