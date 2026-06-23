import { Settings2, Sparkles, Key, Globe, Terminal, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DeveloperPage() {
  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-indigo-500" /> Developer Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Access API credentials, set up webhook events, and configure integrations.
        </p>
      </div>

      <div className="border-gradient rounded-3xl p-px shadow-xl shadow-indigo-100/50">
        <div className="rounded-3xl bg-white px-8 py-10 space-y-6">
          <div className="text-center space-y-4 max-w-md mx-auto mb-6">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary shadow-sm animate-pulse">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-foreground">API &amp; Webhooks Integration</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We are finalizing our developer APIs to allow external integrations with Chrona. Sign up below to get early beta updates.
            </p>
          </div>

          <div className="h-px bg-border my-6" />

          {/* API Key management mockup */}
          <div className="space-y-4 opacity-65 pointer-events-none">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Key className="h-4 w-4" /> API Credentials
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground">Workspace ID</Label>
                <Input value="wksp_729486c9_0b8d_4f7e_9238" readOnly className="h-10 rounded-xl font-mono text-xs bg-muted/30 cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground">Live Secret API Key</Label>
                <div className="flex gap-2">
                  <Input type="password" value="sk_live_51OxF20JvL9sVjE4Qn2G..." readOnly className="h-10 rounded-xl font-mono text-xs bg-muted/30 cursor-not-allowed flex-1" />
                  <button type="button" className="h-10 px-4 rounded-xl border border-border bg-muted/30 text-xs font-bold text-muted-foreground">Copy</button>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-border my-6" />

          {/* Webhook Configuration mockup */}
          <div className="space-y-4 opacity-65 pointer-events-none">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-4 w-4" /> Webhook Subscriptions
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Configure endpoints to receive HTTP POST payloads when events trigger inside your workspace.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground">Endpoint URL</Label>
                <Input value="https://api.yourcompany.com/webhooks/chrona" readOnly className="h-10 rounded-xl bg-muted/30 cursor-not-allowed" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <input type="checkbox" checked disabled className="rounded accent-indigo-600" />
                  task.completed
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <input type="checkbox" checked disabled className="rounded accent-indigo-600" />
                  member.status_changed
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <input type="checkbox" disabled className="rounded accent-indigo-600" />
                  report.generated
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> API access requires Admin or Owner role
            </span>
            <button disabled className="px-5 h-10 rounded-xl bg-primary/20 text-indigo-700 font-bold text-xs cursor-not-allowed">
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
