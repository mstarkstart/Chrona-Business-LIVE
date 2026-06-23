"use client";

import { useState } from "react";
import { Copy, Check, Trash2, Loader2 } from "lucide-react";

export function InviteLinkRow({
  id,
  email,
  role,
  token,
  onCancel,
}: {
  id: string;
  email: string;
  role: string;
  token: string;
  onCancel?: (id: string) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Build the URL on the client so it picks up whatever host the user is on
  function url() {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/invite/${token}`;
  }

  async function copy() {
    await navigator.clipboard.writeText(url());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleCancelConfirm() {
    if (!onCancel) return;
    setCancelling(true);
    setShowDeleteConfirm(false);
    try {
      await onCancel(id);
    } catch (err) {
      console.error("Failed to cancel invitation:", err);
      alert("Failed to cancel invitation. Please try again.");
      setCancelling(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-card p-3.5 text-sm space-y-3 shadow-sm hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-foreground">{email}</span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md ml-2.5">
            {role.replace("_", " ")}
          </span>
        </div>
        
        {onCancel && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={cancelling}
            className="text-xs font-semibold text-red-600 hover:text-red-500 disabled:opacity-50 flex items-center gap-1 cursor-pointer transition-colors"
            type="button"
          >
            {cancelling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span>Cancel Invite</span>
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-muted/65 px-2.5 py-1.5 text-xs text-muted-foreground font-mono">
          {url()}
        </code>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium cursor-pointer transition-all active:scale-95 shadow-sm"
          type="button"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? "Copied" : "Copy link"}</span>
        </button>
      </div>

      {/* ─── Delete Confirmation Modal ─── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="absolute inset-0 bg-slate-955/40 backdrop-blur-md transition-opacity duration-300"
            onClick={() => !cancelling && setShowDeleteConfirm(false)}
          />
          
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-xl p-6 shadow-2xl animate-scale-in z-10 text-center">
            {/* Alert Icon */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-650 border border-red-100 mb-4 animate-pulse-soft">
              <Trash2 className="h-5 w-5" />
            </div>
            
            <h3 className="text-base font-bold text-foreground mb-1.5">Cancel Invitation?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-5">
              Are you sure you want to cancel the invitation for <span className="font-semibold text-foreground">{email}</span>? The recipient will no longer be able to use the link to join.
            </p>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-xs font-semibold rounded-xl text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelConfirm}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-xs font-semibold rounded-xl text-white shadow-[0_0_12px_rgba(220,38,38,0.15)] transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {cancelling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>{cancelling ? "Cancelling..." : "Cancel Invite"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
