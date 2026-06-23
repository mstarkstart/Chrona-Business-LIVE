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

  async function handleCancel() {
    if (!onCancel) return;
    if (!confirm(`Are you sure you want to cancel the invitation for ${email}?`)) return;
    
    setCancelling(true);
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
            onClick={handleCancel}
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
    </div>
  );
}
