"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as Switch from "@radix-ui/react-switch";
import {
  User,
  Building2,
  Zap,
  CreditCard,
  ChevronRight,
  Bot,
  Settings2,
} from "lucide-react";

async function updateUiMode(mode: "simple" | "advanced") {
  await fetch("/api/settings/ui-mode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ui_mode: mode }),
  });
}

export function SettingsForm({
  initialUiMode,
}: {
  initialUiMode: "simple" | "advanced";
}) {
  const [uiMode, setUiMode] = useState<"simple" | "advanced">(initialUiMode);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle(checked: boolean) {
    const next = checked ? "advanced" : "simple";
    setUiMode(next);
    startTransition(async () => {
      await updateUiMode(next);
      router.refresh();
    });
  }

  const isAdvanced = uiMode === "advanced";

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Appearance */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Appearance
        </h2>
        <div className="bg-card border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-bold text-foreground">
                Interface mode
              </p>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                {isAdvanced
                   ? "Advanced — all features visible including automations, analytics, and developer tools."
                   : "Simple — streamlined interface showing only essential features. Recommended for most users."}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-colors ${
                    !isAdvanced
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                      : "bg-slate-100 text-muted-foreground"
                  }`}
                >
                  Simple
                </span>
                <div className="h-px w-4 bg-slate-200" />
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-colors ${
                    isAdvanced
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                      : "bg-slate-100 text-muted-foreground"
                  }`}
                >
                  Advanced
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 pt-0.5 shrink-0">
              <Switch.Root
                checked={isAdvanced}
                onCheckedChange={handleToggle}
                disabled={pending}
                className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full bg-slate-200 transition-colors data-[state=checked]:bg-primary disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Switch.Thumb className="block h-5 w-5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-5 translate-x-0.5" />
              </Switch.Root>
              <span className="text-xs text-muted-foreground font-semibold">
                {isAdvanced ? "On" : "Off"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Account
        </h2>
        <SettingsLink
          href="/settings/profile"
          icon={<User size={18} className="text-indigo-650" />}
          title="Profile"
          description="Edit your personal information, avatar, and contact details."
        />
      </section>

      {/* Workspace */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Workspace
        </h2>
        <SettingsLink
          href="/settings/business"
          icon={<Building2 size={18} className="text-indigo-650" />}
          title="Workspace Settings"
          description="Manage workspace name, industry, team structure, and members."
        />
      </section>

      {/* Multi-function button */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Multi-function button
        </h2>
        <SettingsLink
          href="/settings/multi-function-button"
          icon={<Zap size={18} className="text-indigo-650" />}
          title="Multi-function Button"
          description="Choose up to 6 quick actions surfaced in the toolbar."
        />
      </section>

      {/* Billing */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Billing
        </h2>
        <Link href="/settings/billing" className="block group">
          <div className="bg-card border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:border-primary/50 hover:bg-slate-50/50 transition-all duration-200 cursor-pointer">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors shrink-0">
              <CreditCard size={18} className="text-indigo-655" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">Billing &amp; Plan</p>
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Free plan
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground truncate leading-relaxed mt-0.5">
                View pricing tiers and upgrade your workspace.
              </p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </div>
        </Link>
      </section>

      {/* Advanced — only shown in advanced mode */}
      {isAdvanced && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Advanced Features
          </h2>
          <SettingsLink
            href="/settings/automations"
            icon={<Bot size={18} className="text-indigo-655" />}
            title="Automations"
            description="Trigger actions automatically when conditions are met."
          />
          <SettingsLink
            href="/settings/developer"
            icon={<Settings2 size={18} className="text-indigo-655" />}
            title="Developer"
            description="API keys, webhooks, and integration settings."
          />
        </section>
      )}
    </div>
  );
}

function SettingsLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="block group">
      <div className="bg-card border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:border-primary/50 hover:bg-slate-50/50 transition-all duration-200 cursor-pointer">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors shrink-0">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="text-xs md:text-sm text-muted-foreground truncate leading-relaxed mt-0.5">{description}</p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </div>
    </Link>
  );
}
