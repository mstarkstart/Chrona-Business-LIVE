"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, AlertTriangle } from "lucide-react";

interface Props {
  projectName: string;
  action: () => Promise<void>;
  variant?: "icon" | "button";
}

export function DeleteProjectButton({ projectName, action, variant = "icon" }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await action();
    } catch {
      setDeleting(false);
      setOpen(false);
    }
  }

  const modal = mounted && open ? createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ animation: "fadeIn 150ms ease forwards" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !deleting && setOpen(false)}
      />

      {/* Modal card */}
      <div
        className="relative w-full max-w-sm rounded-3xl p-6 flex flex-col items-center gap-4 text-center"
        style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.80)",
          boxShadow: "0 24px 64px rgba(30,45,61,0.22), inset 0 1px 0 rgba(255,255,255,0.90)",
          animation: "modalIn 200ms cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        {/* Icon */}
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg"
          style={{
            background: "linear-gradient(135deg, #ef4444, #f43f5e)",
            boxShadow: "0 8px 24px rgba(239,68,68,0.35)",
          }}
        >
          <Trash2 className="h-8 w-8 text-white" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            Delete Project
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Are you sure you want to delete{" "}
            <span className="font-bold" style={{ color: "var(--text-primary)" }}>
              &ldquo;{projectName}&rdquo;
            </span>
            ? This cannot be undone and will remove all tasks inside it.
          </p>
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            All tasks in this project will be permanently deleted
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 w-full pt-1">
          <button
            onClick={() => setOpen(false)}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.60)",
              border: "1px solid rgba(200,220,235,0.60)",
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #ef4444, #f43f5e)",
              boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
            }}
          >
            {deleting ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                Delete Project
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.92) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>
    </div>,
    document.body
  ) : null;

  /* Hidden form — server action binding */
  const hiddenForm = (
    <form ref={formRef} action={action} style={{ display: "none" }} />
  );

  if (variant === "button") {
    return (
      <>
        {hiddenForm}
        {modal}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-all cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </>
    );
  }

  return (
    <>
      {hiddenForm}
      {modal}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="absolute top-3 right-3 z-10 h-7 w-7 rounded-lg bg-white/90 hover:bg-red-50 border border-white/50 hover:border-red-200 flex items-center justify-center text-white/70 hover:text-red-600 transition-all shadow-sm opacity-0 group-hover:opacity-100 cursor-pointer"
        title="Delete project"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </>
  );
}
