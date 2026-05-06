"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, ListTodo, Calendar, Building2,
  ShieldCheck, Settings, LogOut, BarChart3,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { BusinessSwitcher } from "./BusinessSwitcher";
import { supabase } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/tasks",        label: "Tasks",        icon: ListTodo },
  { href: "/calendar",     label: "Calendar",     icon: Calendar },
  { href: "/organisation", label: "Organisation", icon: Building2 },
  { href: "/settings",     label: "Settings",     icon: Settings },
];

export type SidebarAProps = {
  active: { id: string; name: string };
  options: { id: string; name: string }[];
  pendingApprovals: number;
  userName: string;
};

export function SidebarA({ active, options, pendingApprovals, userName }: SidebarAProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("chrona-sidebar-a");
    if (saved === "collapsed") setCollapsed(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("chrona-sidebar-a", next ? "collapsed" : "open");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const items = [
    ...NAV,
    ...(pendingApprovals > 0 ? [{ href: "/approvals", label: `Approvals (${pendingApprovals})`, icon: ShieldCheck }] : []),
  ];

  return (
    <aside
      className={`hidden md:relative md:flex flex-col border-r border-border bg-card shrink-0 transition-all duration-250 ease-in-out ${
        collapsed ? "w-[68px]" : "w-64"
      }`}
    >
      {/* Logo + switcher */}
      <div className={`border-b border-border ${collapsed ? "px-3 py-4" : "px-4 py-4"}`}>
        {collapsed ? (
          <div className="flex justify-center">
            <Link href="/dashboard" title="Dashboard">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30 hover:opacity-80 transition-opacity">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
            </Link>
          </div>
        ) : (
          <>
            <Link href="/dashboard" className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
                <BarChart3 className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight">
                Chrona <span className="gradient-text">Business</span>
              </span>
            </Link>
            <BusinessSwitcher active={active} options={options} />
          </>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto py-3 ${collapsed ? "px-2 space-y-1" : "px-3 space-y-0.5"}`}>
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center rounded-xl transition-all ${
                collapsed
                  ? "justify-center p-2.5"
                  : "gap-3 px-3 py-2.5"
              } ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-600" : ""}`} />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {!collapsed && isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-border p-3 ${collapsed ? "flex justify-center" : ""}`}>
        {collapsed ? (
          <button
            onClick={logout}
            title="Sign out"
            className="p-2.5 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-3 px-1 py-1 rounded-xl hover:bg-accent group">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{userName}</div>
              <div className="text-xs text-muted-foreground truncate">{active.name}</div>
            </div>
            <button
              onClick={logout}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 hover:text-red-500 transition-all"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full border border-border bg-white shadow-md flex items-center justify-center hover:bg-accent transition-all"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
          : <ChevronLeft className="h-3 w-3 text-muted-foreground" />}
      </button>
    </aside>
  );
}
