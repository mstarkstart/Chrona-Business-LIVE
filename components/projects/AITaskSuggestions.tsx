"use client";

import { useState } from "react";
import { Loader2, Plus, ChevronDown, ChevronUp, Wand2 } from "lucide-react";
import { suggestProjectTasks } from "@/lib/ai/actions";
import { createTaskInProject } from "@/lib/tasks/mutations";
import { CupertinoLoaderPill } from "@/components/ui/CupertinoLoader";

interface Props {
  projectName: string;
  existingTaskTitles: string[];
  workspaceId: string;
  projectId: string;
}

export function AITaskSuggestions({
  projectName,
  existingTaskTitles,
  workspaceId,
  projectId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track which suggestions have been added and which are being added
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<Set<string>>(new Set());

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    setSuggestions(null);
    setAdded(new Set());
    try {
      const results = await suggestProjectTasks(projectName, existingTaskTitles);
      if (results.length === 0) {
        setError("AI returned no suggestions. Try again.");
      } else {
        setSuggestions(results);
        setOpen(true);
      }
    } catch {
      setError("AI suggestion failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(title: string) {
    if (adding.has(title) || added.has(title)) return;
    setAdding((prev) => new Set(prev).add(title));
    try {
      await createTaskInProject(workspaceId, projectId, title, "pending");
      setAdded((prev) => new Set(prev).add(title));
    } catch {
      // Silently fail — user can retry
    } finally {
      setAdding((prev) => {
        const next = new Set(prev);
        next.delete(title);
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <button
        onClick={handleSuggest}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 transition-colors shadow-sm"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4" />
        )}
        <span className="inline-flex items-center gap-1">
          <span className="text-indigo-500">✨</span>
          {loading ? "Thinking…" : "Suggest tasks"}
        </span>
      </button>

      {loading && (
        <div className="w-full flex justify-end py-2">
          <CupertinoLoaderPill />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 self-start">{error}</p>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="w-full rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 shadow-sm overflow-hidden">
          {/* Header row */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold text-indigo-800 hover:bg-indigo-100/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>✨ AI-suggested tasks</span>
              <span className="rounded-full bg-indigo-200 px-2 py-0.5 text-xs text-indigo-700">
                {suggestions.length}
              </span>
            </span>
            {open ? (
              <ChevronUp className="h-4 w-4 text-indigo-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-indigo-500" />
            )}
          </button>

          {/* Slide-down panel */}
          {open && (
            <ul className="divide-y divide-indigo-100 border-t border-indigo-200">
              {suggestions.map((title, i) => {
                const isAdded = added.has(title);
                const isAdding = adding.has(title);
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-4 px-5 py-3 text-sm text-indigo-900"
                  >
                    <span className="flex-1 leading-snug">{title}</span>
                    <button
                      onClick={() => handleAdd(title)}
                      disabled={isAdded || isAdding}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        isAdded
                          ? "bg-emerald-100 text-emerald-700 cursor-default"
                          : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                      }`}
                    >
                      {isAdding ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isAdded ? (
                        "Added ✓"
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          Add to board
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
