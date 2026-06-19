import { BookOpen } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight">How to Use</h1>
        <p className="text-sm text-muted-foreground mt-1">A quick guide for testers and new users to get started with Chrona.</p>
      </div>

      <div className="space-y-6 animate-fade-up delay-100">
        <section className="bg-white/80 border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            Getting Started
          </h2>
          <div className="space-y-4 text-sm text-foreground/80 leading-relaxed">
            <p>
              <strong>1. Managing Tasks:</strong> Go to the <span className="font-medium text-foreground">My Work</span> tab to view your assigned tasks. You can drag and drop cards between columns (To Do, In Progress, Done) to update their status.
            </p>
            <p>
              <strong>2. Updating Your Status:</strong> In the sidebar (bottom left or top right when collapsed), click your avatar or hover over it to change your current working status (Available, In a Meeting, Deep Work, etc.). This instantly updates for everyone in the workspace.
            </p>
            <p>
              <strong>3. Time Tracking:</strong> Use the <span className="font-medium text-foreground">Time Tracking</span> page to log hours against specific projects and tasks. Ensure you submit your timesheet at the end of the week.
            </p>
            <p>
              <strong>4. Team Dashboard:</strong> The <span className="font-medium text-foreground">Home Dashboard</span> provides a real-time overview of your team's progress, showing who is online and highlighting tasks that need immediate attention.
            </p>
          </div>
        </section>

        <section className="bg-white/80 border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">FAQ for Testers</h2>
          <div className="space-y-4 text-sm text-foreground/80 leading-relaxed">
            <div>
              <h3 className="font-medium text-foreground mb-1">Why is the app slow when I click around?</h3>
              <p className="text-muted-foreground">In the current development environment, pages are built on-demand as you visit them. When deployed to production (e.g., Vercel), navigation will be instant.</p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">Are changes real-time?</h3>
              <p className="text-muted-foreground">Yes! Task updates, status changes, and dashboard metrics sync in real-time across all active users in the workspace.</p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">What can the AI do?</h3>
              <p className="text-muted-foreground">The AI copilot can assist you with answering questions, helping draft content, and quickly summarizing work.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
