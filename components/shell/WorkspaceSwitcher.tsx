"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Check } from "lucide-react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        className={`flex items-center rounded-[10px] bg-white/35 border border-white/55 text-[#1E2D3D] font-semibold text-[14px] hover:bg-white/50 active:scale-[0.97] transition-all duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] btn-press ${collapsed ? "h-11 w-11 justify-center p-0 shrink-0" : "w-full gap-2 px-3 py-2"}`}
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
        <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          collapsed ? "opacity-0 w-0 pointer-events-none" : "truncate flex-1 text-left opacity-100 max-w-[150px] ml-2"
        }`}>
          {active.name}
        </span>
        <ChevronsUpDown className={`text-[#40566E] shrink-0 transition-all duration-300 ${
          collapsed ? "opacity-0 w-0 h-0 pointer-events-none ml-0" : "opacity-100 h-3.5 w-3.5 ml-1"
        }`} />
      </button>

      {open && mounted && createPortal(
        <>
          {/* Invisible backdrop to close on outside click */}
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />

          {/* Dropdown — fixed position to escape sidebar overflow */}
          <div
            style={dropdownStyle}
            className="rounded-xl border border-white/60 bg-[rgba(255,255,255,0.95)] backdrop-blur-[24px] shadow-[0_12px_40px_-8px_rgba(30,45,61,0.25)] overflow-hidden animate-fade-up"
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
        </>,
        document.body
      )}
    </div>
  );
}
