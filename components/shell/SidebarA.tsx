import Link from "next/link";
import { LayoutDashboard, ListTodo, Calendar, Building2, ShieldCheck, Settings, User, LogOut } from "lucide-react";
import { BusinessSwitcher } from "./BusinessSwitcher";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function logout() {
  "use server";
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

export async function SidebarA({
  active,
  options,
  pendingApprovals,
  userName,
}: {
  active: { id: string; name: string };
  options: { id: string; name: string }[];
  pendingApprovals: number;
  userName: string;
}) {
  const items = [
    { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
    { href: "/tasks",        label: "Tasks",        icon: ListTodo },
    { href: "/calendar",     label: "Calendar",     icon: Calendar },
    { href: "/organisation", label: "Organisation", icon: Building2 },
    ...(pendingApprovals > 0
      ? [{ href: "/approvals", label: `Approvals (${pendingApprovals})`, icon: ShieldCheck }]
      : []),
    { href: "/settings",     label: "Settings",     icon: Settings },
    { href: "/settings/profile", label: "Profile",  icon: User },
  ];

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="p-3 border-b border-border">
        <BusinessSwitcher active={active} options={options} />
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
          >
            <it.icon className="h-4 w-4" />
            <span>{it.label}</span>
          </Link>
        ))}
      </nav>
      <div className="border-t border-border p-3 flex items-center justify-between">
        <span className="text-sm truncate">{userName}</span>
        <form action={logout}>
          <button className="rounded-md p-1 hover:bg-accent" title="Log out">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
