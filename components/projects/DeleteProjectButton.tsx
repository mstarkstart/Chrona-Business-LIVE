"use client";

import { Trash2 } from "lucide-react";

interface Props {
  projectName: string;
  action: () => Promise<void>;
  variant?: "icon" | "button";
}

export function DeleteProjectButton({ projectName, action, variant = "icon" }: Props) {
  function handleSubmit(e: React.FormEvent) {
    if (!confirm(`Delete "${projectName}"? This cannot be undone.`)) {
      e.preventDefault();
    }
  }

  if (variant === "button") {
    return (
      <form action={action} onSubmit={handleSubmit}>
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-all cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </form>
    );
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="absolute top-3 right-3 z-10">
      <button
        type="submit"
        className="h-7 w-7 rounded-lg bg-white/90 hover:bg-red-50 border border-white/50 hover:border-red-200 flex items-center justify-center text-white/70 hover:text-red-600 transition-all shadow-sm opacity-0 group-hover:opacity-100 cursor-pointer"
        title="Delete project"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
