"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Check, Building2 } from "lucide-react";

type Item = { id: string; name: string };

export function BusinessSwitcher({ active, options }: { active: Item; options: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function pick(id: string) {
    if (id === active.id) { setOpen(false); return; }
    startTransition(async () => {
      await fetch("/api/business/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: id }),
      });
      setOpen(false);
      router.refresh();
    });
  }

  if (options.length === 1) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate">{active.name}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent transition-colors"
      >
        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium truncate flex-1 text-left">{active.name}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-popover/95 backdrop-blur-xl shadow-xl shadow-black/40 overflow-hidden">
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => pick(o.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent transition-colors"
              >
                <span className="flex-1 text-left truncate">{o.name}</span>
                {o.id === active.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
