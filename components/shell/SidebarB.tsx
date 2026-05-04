import { ActivityStatusPicker } from "./ActivityStatusPicker";
import { LiveActivityList } from "./LiveActivityList";
import type { ActivityStatus } from "@/lib/supabase/types";

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
    <aside className="hidden lg:flex w-72 shrink-0 flex-col border-l border-border bg-card">
      <div className="p-4 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">My status</p>
        <ActivityStatusPicker businessMemberId={props.myMemberId} initial={props.myStatus} />
      </div>

      <Section title="Today's tasks">
        {props.myTasksToday.length === 0
          ? <Empty>No tasks scheduled today.</Empty>
          : props.myTasksToday.map((t) => (
              <li key={t.id} className="text-sm py-1 truncate">{t.title}</li>
            ))}
      </Section>

      <Section title="Suggested">
        {props.suggestedTasks.length === 0
          ? <Empty>Nothing suggested right now.</Empty>
          : props.suggestedTasks.map((t) => (
              <li key={t.id} className="text-sm py-1 truncate text-muted-foreground">{t.title}</li>
            ))}
      </Section>

      <Section title="In progress">
        {props.inProgressTasks.length === 0
          ? <Empty>No active work.</Empty>
          : props.inProgressTasks.map((t) => (
              <li key={t.id} className="text-sm py-1 truncate">{t.title}</li>
            ))}
      </Section>

      <Section title="Active now">
        <LiveActivityList businessId={props.businessId} initial={props.initialPresence} />
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 border-b border-border">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <li className="text-xs text-muted-foreground italic">{children}</li>;
}
