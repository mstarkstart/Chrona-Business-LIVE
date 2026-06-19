"use client";

import { useTransition, useRef } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export function AutoSaveForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  function handleChange() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (formRef.current) {
        startTransition(async () => {
          const formData = new FormData(formRef.current!);
          await action(formData);
        });
      }
    }, 500); // 500ms debounce
  }

  return (
    <form ref={formRef} action={action} onChange={handleChange} className={className}>
      {children}
      <div className="md:col-span-2 flex items-center justify-end gap-2 text-sm text-muted-foreground mt-4">
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Saved</span>
          </>
        )}
      </div>
    </form>
  );
}
