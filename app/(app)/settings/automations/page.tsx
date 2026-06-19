import { Bot, Sparkles, Clock, AlertTriangle, Mail } from "lucide-react";

export default function AutomationsPage() {
  const exampleAutomations = [
    {
      id: "auto-assign",
      title: "Auto-assign unassigned tasks",
      desc: "Assign unassigned tasks to the team member with the lowest load after 24 hours.",
      icon: Clock,
      iconColor: "text-indigo-500",
      bgColor: "bg-indigo-50",
    },
    {
      id: "overdue-alert",
      title: "Notify manager on overdue tasks",
      desc: "Trigger a warning notification to department managers when a task passes its deadline.",
      icon: AlertTriangle,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-50",
    },
    {
      id: "weekly-digest",
      title: "Weekly team productivity digest",
      desc: "Compile completed tasks and active focus-hours into a weekly report email sent to c-suite.",
      icon: Mail,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-50",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-3xl animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Bot className="h-6 w-6 text-indigo-500" /> Automations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Streamline your workforce workflows with custom rules and automated tasks.
        </p>
      </div>

      <div className="border-gradient rounded-3xl p-px shadow-xl shadow-indigo-100/50">
        <div className="rounded-3xl bg-white px-8 py-10 text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary shadow-sm animate-bounce">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-foreground">Workspace Automations Coming Soon</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We are building a powerful workflow engine to automate routine updates, trigger notifications, and manage workloads automatically.
            </p>
          </div>
          
          <div className="h-px bg-border my-6" />

          {/* Example Cards */}
          <div className="text-left space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Preview of Upcoming Automations</h3>
            <div className="grid grid-cols-1 gap-4">
              {exampleAutomations.map((aut) => {
                const Icon = aut.icon;
                return (
                  <div key={aut.id} className="border border-border bg-muted/10 rounded-2xl p-4.5 flex items-start gap-4 hover:border-indigo-100 transition-colors opacity-75">
                    <div className={`h-10 w-10 rounded-xl ${aut.bgColor} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-5 w-5 ${aut.iconColor}`} />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-foreground">{aut.title}</span>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Preview</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{aut.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
