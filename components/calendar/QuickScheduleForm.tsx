"use client";

import { useTransition, useRef } from "react";
import { CalendarPlus, Globe, MoreHorizontal } from "lucide-react";
import { EVENT_COLOR, EVENT_LABEL, EVENT_ICON } from "@/components/calendar/constants";

const EVENT_ICON_KEYS = ["meeting", "task_block", "break", "lunch", "training", "focus", "other"];

interface QuickScheduleFormProps {
  createEvent: (fd: FormData) => Promise<void>;
  defaultDate: string;
}

export function QuickScheduleForm({ createEvent, defaultDate }: QuickScheduleFormProps) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await createEvent(fd);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
          Title
        </label>
        <input
          name="title"
          required
          placeholder="What are you scheduling?"
          className="w-full h-10 rounded-xl border border-white/80 bg-white/50 px-3.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white transition-all shadow-sm"
        />
      </div>

      {/* Event type chips with icons */}
      <div>
        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
          Type
        </label>
        <div className="flex flex-wrap gap-1.5">
          {EVENT_ICON_KEYS.map((key) => {
            const Icon = EVENT_ICON[key] ?? MoreHorizontal;
            return (
              <label key={key} className="cursor-pointer">
                <input
                  type="radio"
                  name="event_type"
                  value={key}
                  className="sr-only peer"
                  defaultChecked={key === "meeting"}
                />
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:shadow-md cursor-pointer hover:bg-white bg-white/40 select-none"
                  style={{
                    color: EVENT_COLOR[key],
                    borderColor: EVENT_COLOR[key] + "40",
                  }}
                >
                  <Icon className="h-3 w-3" />
                  {EVENT_LABEL[key] ?? key}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
          Date
        </label>
        <input
          name="date"
          type="date"
          required
          defaultValue={defaultDate}
          className="w-full h-10 rounded-xl border border-white/80 bg-white/50 px-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white transition-all shadow-sm"
        />
      </div>

      {/* Start + End time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
            Start Time
          </label>
          <input
            name="start_time"
            type="time"
            required
            className="w-full h-10 rounded-xl border border-white/80 bg-white/50 px-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white transition-all shadow-sm"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
            End Time
          </label>
          <input
            name="end_time"
            type="time"
            required
            className="w-full h-10 rounded-xl border border-white/80 bg-white/50 px-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
          Notes <span className="font-normal normal-case">(optional)</span>
        </label>
        <textarea
          name="description"
          placeholder="Agenda, link, or any notes…"
          rows={2}
          maxLength={280}
          className="w-full rounded-xl border border-white/80 bg-white/50 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white transition-all shadow-sm"
        />
      </div>

      {/* Share with team toggle */}
      <label className="flex items-start gap-3.5 p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100/60 cursor-pointer hover:bg-indigo-100/80 transition-all mt-4 group shadow-sm">
        <input
          type="checkbox"
          name="is_team"
          className="mt-0.5 h-4 w-4 rounded accent-indigo-600 cursor-pointer transition-transform group-active:scale-95"
        />
        <div>
          <p className="text-sm font-bold text-indigo-900 flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-600" />
            Visible to team
          </p>
          <p className="text-[11px] font-medium text-indigo-600/70 mt-1 leading-relaxed">
            Teammates will see this event on the Team Calendar.
          </p>
        </div>
      </label>

      {/* Submit button */}
      <button
        type="submit"
        disabled={pending}
        className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] mt-4 hover:shadow-indigo-600/40 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {pending ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Scheduling…
          </>
        ) : (
          <>
            <CalendarPlus className="h-4 w-4" />
            Add to Calendar
          </>
        )}
      </button>
    </form>
  );
}
