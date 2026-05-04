"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Item = { id: string; name: string };

export function BusinessSwitcher({
  active,
  options,
}: {
  active: Item;
  options: Item[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(id: string) {
    if (id === active.id) return;
    startTransition(async () => {
      await fetch("/api/business/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: id }),
      });
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-accent">
        <span className="truncate font-medium">{active.name}</span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        {options.map((o) => (
          <DropdownMenuItem
            key={o.id}
            onSelect={() => pick(o.id)}
            disabled={pending}
            className="flex items-center justify-between"
          >
            <span className="truncate">{o.name}</span>
            {o.id === active.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
