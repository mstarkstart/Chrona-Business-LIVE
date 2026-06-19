"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Users, Target } from "lucide-react";

export function CalendarStepClient() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6 mt-8"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Built-in Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Chrona ships with a powerful built-in calendar — no external sync required.
          Schedule meetings, focus blocks, breaks, and tasks directly from the app.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { icon: CalendarDays, title: "Today / Week / Month", desc: "Flexible calendar views for every planning style" },
          { icon: Clock, title: "Focus Blocks", desc: "Schedule deep work time and protect it from interruptions" },
          { icon: Users, title: "Team Scheduling", desc: "Coordinate availability across your whole team" },
          { icon: Target, title: "Task Deadlines", desc: "Tasks with due dates automatically appear on the calendar" },
        ].map(({ icon: Icon, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.35 }}
            className="rounded-xl border border-border bg-card p-5 flex gap-3"
          >
            <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Icon className="h-4.5 w-4.5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          onClick={() => router.back()}
          variant="ghost"
          size="lg"
          className="h-12 px-5 rounded-xl text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Link href="/signup/complete">
          <Button size="lg" className="px-8 h-12 rounded-xl bg-primary text-white font-semibold shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center gap-1.5">
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
