import Link from "next/link";
import { LayoutDashboard, ListTodo, Calendar, Building2, ShieldCheck, Settings, User, LogOut, Layers } from "lucide-react";
import { BusinessSwitcher } from "./BusinessSwitcher";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function logout() {
  "use server";
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

const NAV_ITEMS = [
  { href: "/dashboard",            label: "Dashboard",    icon: LayoutDashboard },
  { href: "/tasks",                label: "Tasks",        icon: ListTodo },
  { href: "/calendar",             label: "Calendar",     icon: Calendar },
  { href: "/organisation",         label: "Organisation", icon: Building2 },
  { href: "/settings",             label: "Settings",     icon: Settings },
];

export async function SidebarA({
  active,
  options,
  pendingApprovals,
  userName,
  currentPath,
}: {
  active: { id: string; name: string };
  options: { id: string; name: string }[];
  pendingApprovals: number;
  userName: string;
  currentPath?: string;
}) {
  const items = [
    ...NAV_ITEMS,
    ...(pendingApprovals > 0
      ? [{ href: "/approvals", label: `Approvals (${pendingApprovals})`, icon: ShieldCheck }]
      : []),
    { href: "/settings/profile", label: "Profile", icon: User },
  ];

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card/60 backdrop-blur-xl">
      {/* Logo area */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/30">
            <Layers className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">
            Chrona <span className="gradient-text">Business</span>
          </span>
        </div>
        <BusinessSwitcher active={active} options={options} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const isActive = currentPath?.startsWith(item.href) ?? false;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-accent group">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{userName}</div>
            <div className="text-xs text-muted-foreground">{active.name}</div>
          </div>
          <form action={logout}>
            <button className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all" title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
