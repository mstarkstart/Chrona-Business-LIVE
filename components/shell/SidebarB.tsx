import { ActivityStatusPicker } from "./ActivityStatusPicker";
import { LiveActivityList } from "./LiveActivityList";
import type { ActivityStatus } from "@/lib/supabase/types";
import { CheckCircle2, Sparkles, Clock, Radio } from "lucide-react";

export type SidebarBProps = {
  businessId: string;
  myMemberId: string;
  myStatus: ActivityStatus;
  myTasksToday: { id: string; title: string }[];
  suggestedTasks: { id: string; title: string }[];
  inProgressTasks: { id: string; title: string }[];
  initialPresence: { business_member_id: string; user_name: string; status: ActivityStatus }[];
};

export function SidebarB(props: SidebarBProps) {
  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col border-l border-border bg-card/60 backdrop-blur-xl overflow-y-auto">

      {/* Status */}
      <div className="p-4 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">My status</p>
        <ActivityStatusPicker businessMemberId={props.myMemberId} initial={props.myStatus} />
      </div>

      {/* In progress */}
      <Section icon={<Clock className="h-3.5 w-3.5" />} title="In progress">
        {props.inProgressTasks.length === 0
          ? <Empty>No active work right now.</Empty>
          : props.inProgressTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" />
                <span className="truncate">{t.title}</span>
              </li>
            ))}
      </Section>

      {/* Today's tasks */}
      <Section icon={<CheckCircle2 className="h-3.5 w-3.5" />} title="Today&apos;s tasks">
        {props.myTasksToday.length === 0
          ? <Empty>Nothing scheduled today.</Empty>
          : props.myTasksToday.map((t) => (
              <li key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                <div className="h-3.5 w-3.5 rounded border border-border shrink-0" />
                <span className="truncate text-muted-foreground">{t.title}</span>
              </li>
            ))}
      </Section>

      {/* Suggested */}
      <Section icon={<Sparkles className="h-3.5 w-3.5" />} title="Suggested">
        {props.suggestedTasks.length === 0
          ? <Empty>All tasks are assigned.</Empty>
          : props.suggestedTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                <Sparkles className="h-3 w-3 text-violet-400 shrink-0" />
                <span className="truncate text-muted-foreground">{t.title}</span>
              </li>
            ))}
      </Section>

      {/* Live team */}
      <Section icon={<Radio className="h-3.5 w-3.5" />} title="Team now">
        <LiveActivityList businessId={props.businessId} initial={props.initialPresence} />
      </Section>

    </aside>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-muted-foreground">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
           dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <li className="text-xs text-muted-foreground/60 italic py-1">{children}</li>;
}
