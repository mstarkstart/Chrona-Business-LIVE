// Server component — pure JSX dashboard mockup. No state, no interactivity.
import { LayoutDashboard, ListTodo, Calendar, Building2, Settings, Bell } from "lucide-react";

const STATS = [
  { label: "Tasks complete", value: "84%", bar: 84, color: "#4f46e5" },
  { label: "Team active",    value: "12",  bar: 100, color: "#10b981" },
  { label: "Avg load",       value: "3.4h",bar: 60, color: "#f97316" },
];

const TASKS = [
  { title: "Q3 roadmap proposal",    priority: "urgent", color: "#ef4444" },
  { title: "Design system audit",    priority: "high",   color: "#f97316" },
  { title: "Customer demo prep",     priority: "normal", color: "#10b981" },
];

const PEOPLE = [
  { name: "Olivia Carter", status: "Tasking",   color: "#eab308", initial: "OC" },
  { name: "Marcus Lee",    status: "Meeting",   color: "#f97316", initial: "ML" },
  { name: "Sam Park",      status: "Available", color: "#10b981", initial: "SP" },
  { name: "Cleo Tanaka",   status: "Tasking",   color: "#eab308", initial: "CT" },
];

export function HeroMockup() {
  return (
    <div className="rounded-3xl bg-white border border-border shadow-2xl shadow-indigo-200/50 overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <div className="ml-3 flex-1 max-w-md mx-auto h-7 rounded-md bg-white border border-border flex items-center justify-center px-3 gap-1.5 text-xs text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          chrona.workspace/dashboard
        </div>
        <Bell className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-[200px_1fr] min-h-[420px]">
        {/* Sidebar */}
        <div className="border-r border-border bg-muted/30 p-3 space-y-1">
          <div className="px-2 py-1.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <div className="h-3 w-3 rounded-sm bg-white opacity-80" />
              </div>
              <div className="text-sm font-semibold">Pixelforge</div>
            </div>
          </div>

          {[
            { icon: LayoutDashboard, label: "Dashboard", active: true },
            { icon: ListTodo,        label: "Tasks",     active: false, badge: "3" },
            { icon: Calendar,        label: "Calendar",  active: false },
            { icon: Building2,       label: "Org",       active: false },
            { icon: Settings,        label: "Settings",  active: false },
          ].map((item, i) => {
            const I = item.icon;
            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs ${
                  item.active
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                <I className="h-3.5 w-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Main */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-base font-bold tracking-tight">Good morning, Olivia 👋</div>
              <div className="text-xs text-muted-foreground">Pixelforge Studio · Employer view</div>
            </div>
            <div className="flex items-center gap-1.5">
              {PEOPLE.slice(0, 3).map((p, i) => (
                <div
                  key={p.name}
                  className="h-6 w-6 rounded-full border-2 border-white text-[9px] font-bold flex items-center justify-center text-white"
                  style={{ background: p.color, marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i }}
                >
                  {p.initial}
                </div>
              ))}
              <div className="h-6 w-6 rounded-full border-2 border-white bg-muted text-[9px] font-bold flex items-center justify-center text-muted-foreground" style={{ marginLeft: -8 }}>
                +9
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl bg-muted/40 border border-border p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  {s.label}
                </div>
                <div className="text-xl font-bold tracking-tight">{s.value}</div>
                <div className="mt-2 h-1.5 rounded-full bg-white overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.bar}%`, background: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Priority tasks */}
            <div className="rounded-xl bg-muted/30 border border-border p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Priority tasks
              </div>
              <div className="space-y-1.5">
                {TASKS.map((t) => (
                  <div key={t.title} className="flex items-center gap-2 text-xs">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />
                    <span className="truncate text-gray-800">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live activity */}
            <div className="rounded-xl bg-muted/30 border border-border p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Live now
                </div>
              </div>
              <div className="space-y-1.5">
                {PEOPLE.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-xs">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
                    <span className="text-gray-800 truncate">{p.name}</span>
                    <span className="ml-auto text-muted-foreground text-[10px]">{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
