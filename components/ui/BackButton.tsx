"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-slate-100 border border-transparent hover:border-slate-200/80 transition-all duration-200 cursor-pointer active:scale-95 mb-4 group"
    >
      <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      Back
    </button>
  );
}
