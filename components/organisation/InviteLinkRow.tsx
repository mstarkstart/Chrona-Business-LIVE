"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function InviteLinkRow({
  email,
  role,
  token,
}: {
  email: string;
  role: string;
  token: string;
}) {
  const [copied, setCopied] = useState(false);

  // Build the URL on the client so it picks up whatever host the user is on
  // (localhost, Vercel preview, prod) without us having to thread it through SSR.
  function url() {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/invite/${token}`;
  }

  async function copy() {
    await navigator.clipboard.writeText(url());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <li className="rounded-lg border border-border bg-card p-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium">{email}</span>
        <span className="text-xs text-muted-foreground capitalize">{role.replace("_", " ")}</span>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">/invite/{token.slice(0, 16)}…</code>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
          type="button"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </li>
  );
}
