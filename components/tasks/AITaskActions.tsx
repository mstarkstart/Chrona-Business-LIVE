"use client";

import { useState } from "react";
import { Loader2, Wand2, Calendar, FileText } from "lucide-react";
import { draftTaskDescription, suggestDueDate, summarizeComments } from "@/lib/ai/actions";

interface Props {
  taskId: string;
  title: string;
  priority: string;
  workspaceId: string;
  /** Pass the comment bodies (strings) so the Summarize button works */
  commentBodies?: string[];
}

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
      ✨ AI
    </span>
  );
}

function Spinner() {
  return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
}

// ─── Draft Description ────────────────────────────────────────────────────────

export function AIDraftDescription({ title }: { title: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDraft() {
    setLoading(true);
    setError(null);
    try {
      const text = await draftTaskDescription(title);
      setResult(text);
    } catch {
      setError("AI draft failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <button
        onClick={handleDraft}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 transition-colors"
      >
        <AiBadge />
        {loading ? (
          <>
            <Spinner />
            Drafting…
          </>
        ) : (
          <>
            <FileText className="h-3.5 w-3.5" />
            AI Draft description
          </>
        )}
      </button>

      {result && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 leading-relaxed">
          <p className="font-semibold text-xs text-indigo-500 uppercase tracking-wider mb-1">
            AI-drafted description
          </p>
          <p>{result}</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

// ─── Suggest Due Date ─────────────────────────────────────────────────────────

export function AISuggestDueDate({
  title,
  priority,
}: {
  title: string;
  priority: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // We use a rough open-hours estimate; a real app would fetch from the API
  const WORKLOAD_ESTIMATE = 20;

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    try {
      const date = await suggestDueDate(title, priority, WORKLOAD_ESTIMATE);
      setResult(date);
    } catch {
      setError("AI suggestion failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-1 space-y-2">
      <button
        onClick={handleSuggest}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 transition-colors"
      >
        <AiBadge />
        {loading ? (
          <>
            <Spinner />
            Thinking…
          </>
        ) : (
          <>
            <Calendar className="h-3.5 w-3.5" />
            Suggest due date
          </>
        )}
      </button>

      {result && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-900 inline-flex items-center gap-2">
          <span className="font-semibold text-xs text-indigo-500 uppercase tracking-wider">
            AI suggests:
          </span>
          <span className="font-mono font-semibold">{result}</span>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

// ─── Summarize Comments ───────────────────────────────────────────────────────

export function AISummarizeComments({ commentBodies }: { commentBodies: string[] }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (commentBodies.length === 0) return null;

  async function handleSummarize() {
    setLoading(true);
    setError(null);
    try {
      const summary = await summarizeComments(commentBodies);
      setResult(summary);
    } catch {
      setError("AI summarization failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleSummarize}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 transition-colors"
      >
        <AiBadge />
        {loading ? (
          <>
            <Spinner />
            Summarizing…
          </>
        ) : (
          <>
            <Wand2 className="h-3.5 w-3.5" />
            Summarize comments
          </>
        )}
      </button>

      {result && (
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 px-4 py-3 text-sm text-indigo-900 leading-relaxed">
          <p className="font-semibold text-xs text-indigo-500 uppercase tracking-wider mb-1.5">
            ✨ AI summary
          </p>
          <p>{result}</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

// ─── Combined wrapper (for easy import in the task page) ──────────────────────

export function AITaskActions({ title, priority, commentBodies = [] }: Props) {
  return (
    <div className="space-y-6">
      <AIDraftDescription title={title} />
      <AISuggestDueDate title={title} priority={priority} />
      {commentBodies.length > 0 && (
        <AISummarizeComments commentBodies={commentBodies} />
      )}
    </div>
  );
}
