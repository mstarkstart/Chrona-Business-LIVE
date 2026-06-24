"use client";

import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="w-full flex flex-col flex-1"
      style={{ animation: 'page-enter-fade 300ms ease both' }}
    >
      {children}
    </div>
  );
}
