"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "cmdk";
import {
  Plus,
  FolderOpen,
  FileText,
  UserPlus,
  Home,
  CheckSquare,
  LayoutGrid,
  Calendar,
  BookOpen,
  Inbox,
  Settings,
  Building2,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

const QUICK_ACTIONS = [
  { id: "new-task",    label: "New task",      icon: Plus,        href: "/tasks?new=1" },
  { id: "new-project", label: "New project",   icon: FolderOpen,  href: "/projects?new=1" },
  { id: "new-doc",    label: "New doc",        icon: FileText,    href: "/docs?new=1" },
  { id: "invite",     label: "Invite member",  icon: UserPlus,    href: "/organisation/members?invite=1" },
];

const NAV_ITEMS = [
  { id: "home",         label: "Home",          icon: Home,        href: "/" },
  { id: "my-work",      label: "My Work",       icon: CheckSquare, href: "/tasks" },
  { id: "projects",     label: "Projects",      icon: LayoutGrid,  href: "/projects" },
  { id: "calendar",     label: "Calendar",      icon: Calendar,    href: "/calendar" },
  { id: "docs",         label: "Docs",          icon: BookOpen,    href: "/docs" },
  { id: "inbox",        label: "Inbox",         icon: Inbox,       href: "/inbox" },
  { id: "settings",     label: "Settings",      icon: Settings,    href: "/settings" },
  { id: "organisation", label: "Organisation",  icon: Building2,   href: "/organisation" },
];

export function CommandPalette({ open, onClose, workspaceId: _workspaceId }: CommandPaletteProps) {
  const router = useRouter();

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose]
  );

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Toggle: if already open, close; otherwise this is handled by parent
        // Parent controls open state, but we re-emit so parent can toggle.
        // We fire a custom event the Topbar can listen to — but simpler: parent passes onClose,
        // and the Topbar also listens for Ctrl+K to open. We just handle Escape here.
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed left-1/2 z-[61] -translate-x-1/2"
        style={{ top: "15vh" }}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="w-[560px] rounded-2xl bg-white shadow-2xl shadow-black/20 border border-border overflow-hidden">
          <Command
            className="flex flex-col"
            shouldFilter={true}
          >
            <div className="flex items-center border-b border-border px-4">
              <CommandInput
                autoFocus
                placeholder="Search tasks, projects, people…"
                className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
              />
            </div>

            <CommandList className="max-h-[420px] overflow-y-auto p-2">
              <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
                No results found.
              </CommandEmpty>

              <CommandGroup
                heading="Quick Actions"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {QUICK_ACTIONS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.label}
                      onSelect={() => navigate(item.href)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground cursor-pointer select-none
                        aria-selected:bg-indigo-50 aria-selected:text-indigo-700
                        data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-700
                        hover:bg-accent transition-colors"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-medium">{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              <CommandGroup
                heading="Navigate"
                className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.label}
                      onSelect={() => navigate(item.href)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground cursor-pointer select-none
                        aria-selected:bg-indigo-50 aria-selected:text-indigo-700
                        data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-700
                        hover:bg-accent transition-colors"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>

            {/* Footer hint */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-gray-50/70">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <kbd className="rounded border border-border bg-white px-1 py-0.5 text-[10px] font-mono shadow-sm">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <kbd className="rounded border border-border bg-white px-1 py-0.5 text-[10px] font-mono shadow-sm">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <kbd className="rounded border border-border bg-white px-1 py-0.5 text-[10px] font-mono shadow-sm">Esc</kbd>
                close
              </span>
            </div>
          </Command>
        </div>
      </div>
    </>
  );
}
