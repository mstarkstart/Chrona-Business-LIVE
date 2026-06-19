import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { can } from "@/lib/auth/permissions";
import { User, Building2, Sliders, Star, ArrowRight, HelpCircle, UserPlus } from "lucide-react";

export default async function SettingsPage() {
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("ui_mode")
    .eq("id", user.id)
    .maybeSingle();

  const initialUiMode = profile?.ui_mode === "advanced" ? "advanced" : "simple";
  const canEditBusiness = can(active.role, "workspace.update");

  const sections = [
    {
      href: "/settings/profile",
      icon: <User className="h-5 w-5 text-indigo-500" />,
      iconBg: "bg-indigo-50 border-indigo-100",
      title: "Profile",
      desc: "Update your name, avatar, contact info and personal details.",
    },
    ...(canEditBusiness ? [{
      href: "/settings/business",
      icon: <Building2 className="h-5 w-5 text-violet-500" />,
      iconBg: "bg-violet-50 border-violet-100",
      title: "Workspace",
      desc: "Manage workspace name, industry, logo, and team estimates.",
    }] : []),
    {
      href: "/settings/multi-function-button",
      icon: <Sliders className="h-5 w-5 text-emerald-500" />,
      iconBg: "bg-emerald-50 border-emerald-100",
      title: "Quick Actions",
      desc: "Customise which actions appear in your + shortcut button.",
    },
    {
      href: "/rewards",
      icon: <Star className="h-5 w-5 text-amber-500" />,
      iconBg: "bg-amber-50 border-amber-100",
      title: "Rewards & Points",
      desc: "View your earned points, streaks, and team leaderboard.",
    },
    {
      href: "/settings/help",
      icon: <HelpCircle className="h-5 w-5 text-blue-500" />,
      iconBg: "bg-blue-50 border-blue-100",
      title: "How to Use",
      desc: "Guides and documentation for getting started.",
    },
    ...(can(active.role, "member.add") ? [{
      href: "/organisation/members",
      icon: <UserPlus className="h-5 w-5 text-rose-500" />,
      iconBg: "bg-rose-50 border-rose-100",
      title: "Invite Members",
      desc: "Invite teammates by email, set their role, department, and contract type.",
    }] : []),
  ];

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account, workspace, and preferences.</p>
      </div>

      {/* Quick-nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up delay-100">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}
            className="group flex items-start gap-4 rounded-2xl border border-border bg-white/80 p-5 shadow-sm card-hover transition-all">
            <div className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 ${s.iconBg}`}>
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* UI mode preference (inline, no nav) */}
      <div className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm animate-fade-up delay-200">
        <p className="text-sm font-semibold mb-1">Interface Mode</p>
        <p className="text-xs text-muted-foreground mb-4">Simple mode hides advanced controls. Advanced mode shows all options.</p>
        <SettingsForm initialUiMode={initialUiMode} />
      </div>
    </div>
  );
}
