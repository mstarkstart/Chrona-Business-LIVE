"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Check } from "lucide-react";

type Item = { id: string; name: string; logoUrl?: string | null };

export function WorkspaceSwitcher({
  active,
  options,
  collapsed = false,
}: {
  active: Item;
  options: Item[];
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Compute fixed position when opening so it escapes any overflow:hidden parent
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      if (collapsed) {
        setDropdownStyle({
          position: "fixed",
          top: rect.top,
          left: rect.right + 8,
          minWidth: 220,
          zIndex: 9999,
        });
      } else {
        setDropdownStyle({
          position: "fixed",
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
          minWidth: 200,
          zIndex: 9999,
        });
      }
    }
  }, [open, collapsed]);

  function pick(id: string) {
    if (id === active.id) { setOpen(false); return; }
    startTransition(async () => {
      await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: id }),
      });
      setOpen(false);
      router.refresh();
    });
  }

  const initial = active.name.charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="w-full flex items-center rounded-lg hover:bg-slate-100 transition-all cursor-pointer p-1.5 gap-2"
      >
        {active.logoUrl ? (
          <img
            src={active.logoUrl}
            alt={active.name}
            className="h-8 w-8 rounded-lg object-cover shrink-0 shadow-sm"
          />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-xs text-white shadow-md shadow-indigo-500/20 shrink-0">
            {initial}
          </div>
        )}
        <span className={`font-medium truncate flex-1 text-left text-sm transition-[opacity,max-width] duration-300 overflow-hidden whitespace-nowrap ${
          collapsed ? "opacity-0 max-w-0 pointer-events-none" : "opacity-100 max-w-[150px]"
        }`}>
          {active.name}
        </span>
        <ChevronsUpDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-[opacity,width] duration-300 ${
          collapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100 w-3.5"
        }`} />
      </button>

      {open && (
        <>
          {/* Invisible backdrop to close on outside click */}
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />

          {/* Dropdown — fixed position to escape sidebar overflow */}
          <div
            style={dropdownStyle}
            className="rounded-xl border border-border bg-white shadow-2xl overflow-hidden animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border bg-slate-50/80">
              Switch Workspace
            </div>
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => pick(o.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-indigo-50 transition-colors text-foreground text-left cursor-pointer"
              >
                {o.logoUrl ? (
                  <img src={o.logoUrl} alt={o.name} className="h-6 w-6 rounded-md object-cover shrink-0" />
                ) : (
                  <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {o.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="flex-1 truncate font-medium">{o.name}</span>
                {o.id === active.id && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
