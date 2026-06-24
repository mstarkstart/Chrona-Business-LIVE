"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

/**
 * Thin client wrapper — detects view/myWork/tab URL param changes and
 * replays a Framer Motion enter animation on every toggle.
 * Children are server-rendered RSC; we just animate the container.
 */
export function TasksAnimated({ children }: { children: React.ReactNode }) {
  const sp = useSearchParams();
  // Key changes on every view/myWork/tab change → React remounts → animation fires
  const animKey = `${sp.get("view") ?? "list"}-${sp.get("myWork") ?? "0"}-${sp.get("tab") ?? "active"}`;

  return (
    <motion.div
      key={animKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.24,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
