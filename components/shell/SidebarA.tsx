"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { ProfileQuickPanel } from "./ProfileQuickPanel";
import { STATUS_COLOUR } from "@/lib/realtime/presence";
import { supabase } from "@/lib/supabase/client";
import type { ActivityStatus } from "@/lib/supabase/types";

const NAV_MAIN = [
  { href: "/dashboard",  label: "Home",         emoji: "🏠" },
  { href: "/tasks",      label: "My Work",      emoji: "📝" },
  { href: "/timesheets", label: "Time Tracking", emoji: "⏱️" },
  { href: "/projects",   label: "Projects",     emoji: "📁" },
  { href: "/calendar",   label: "Calendar",     emoji: "📅" },
  { href: "/chat",       label: "Chat",         emoji: "💬" },
  { href: "/inbox",      label: "Inbox",        emoji: "📥" },
];

const NAV_BOTTOM = [
  { href: "/organisation", label: "Organisation", emoji: "🏢" },
  { href: "/docs",         label: "Docs",         emoji: "📄" },
  { href: "/settings",     label: "Settings",     emoji: "⚙️" },
];

export type SidebarAProps = {
  active: { id: string; name: string; logoUrl?: string | null };
  options: { id: string; name: string; logoUrl?: string | null }[];
  pendingApprovals: number;
  userName: string;
  avatarUrl?: string | null;
  userRole?: string;
  myStatus?: ActivityStatus;
  myMemberId?: string;
  unreadNotifications?: number;
};

export function SidebarA({
  active,
  options,
  pendingApprovals,
  userName,
  avatarUrl,
  userRole = "member",
  myStatus = "available",
  myMemberId,
  unreadNotifications = 0,
}: SidebarAProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const footerRef = useRef<HTMLDivElement>(null);

  const [currentStatus, setCurrentStatus] = useState<ActivityStatus>(myStatus);

  useEffect(() => {
    setCurrentStatus(myStatus);
  }, [myStatus]);

  useEffect(() => {
    if (!myMemberId) return;
    const channel = supabase
      .channel(`self-presence-sync-a:${myMemberId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_status",
          filter: `workspace_member_id=eq.${myMemberId}`,
        },
        (payload) => {
          const updated = payload.new as { status: ActivityStatus } | undefined;
          if (updated) {
            setCurrentStatus(updated.status);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [myMemberId]);

  useEffect(() => {
    const saved = localStorage.getItem("chrona-sidebar-a");
    if (saved === "collapsed") setCollapsed(true);
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (profileOpen && footerRef.current && !footerRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [profileOpen]);

  function toggle() {
    setProfileOpen(false);
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("chrona-sidebar-a", next ? "collapsed" : "open");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }



  const navItems = [
    ...NAV_MAIN,
    ...(pendingApprovals > 0
      ? [{ href: "/approvals", label: `Approvals (${pendingApprovals})`, emoji: "🛡️" }]
      : []),
  ];

  function NavItem({ href, label, emoji, badge }: { href: string; label: string; emoji: string; badge?: number }) {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={`group/nav flex items-center rounded-xl transition-all duration-300 relative cursor-pointer active:scale-[0.98] px-3 py-2.5 ${
          isActive
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        }`}
      >
        <span className={`text-base shrink-0 select-none transition-all duration-300 ease-in-out ${collapsed ? "mr-0" : "mr-3"}`}>
          {emoji}
        </span>
        <span className={`text-sm font-medium overflow-hidden whitespace-nowrap flex-1 transition-all duration-300 ease-in-out ${
          collapsed ? "opacity-0 max-w-0 pointer-events-none" : "opacity-100 max-w-[200px]"
        }`}>
          {label}
        </span>
        {!collapsed && isActive && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground shrink-0" />}
        {badge != null && badge > 0 && (
          <span className={`${collapsed ? "absolute -top-1 -right-1" : ""} inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold`}>
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    );
  }

  const initials = userName.charAt(0).toUpperCase();
  const statusColor = STATUS_COLOUR[currentStatus];

  return (
    // Outer wrapper: relative but NOT overflow-hidden so collapse button is never clipped
    <div
      className="hidden md:relative md:flex shrink-0"
      style={{
        width: collapsed ? 68 : 256,
        transition: "width 180ms cubic-bezier(0.16,1,0.3,1)",
        willChange: "width",
      }}
    >
      {/* Inner aside: overflow-hidden for smooth width animation */}
      <aside className="flex flex-col border-r border-border bg-card w-full overflow-hidden">

        {/* Logo + workspace switcher */}
        <div className="border-b border-border p-4 flex flex-col gap-3 overflow-visible shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30 shrink-0">
              <BarChart3 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className={`font-bold text-sm tracking-tight text-foreground overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
              collapsed ? "opacity-0 max-w-0 pointer-events-none" : "opacity-100 max-w-[150px]"
            }`}>
              Chrona <span className="gradient-text font-black">V1</span>
            </span>
          </Link>
          <WorkspaceSwitcher active={active} options={options} collapsed={collapsed} />
        </div>

        {/* Main nav */}
        <nav className={`flex-1 overflow-y-auto py-3 ${collapsed ? "px-2 space-y-1" : "px-3 space-y-0.5"}`}>
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              emoji={item.emoji}
              badge={item.href === "/inbox" ? unreadNotifications : undefined}
            />
          ))}
          <div className="my-2 border-t border-border" />
          {NAV_BOTTOM.map((item) => (
            <NavItem key={item.href} href={item.href} label={item.label} emoji={item.emoji} />
          ))}
        </nav>

        {/* User footer */}
        <div
          ref={footerRef}
          className="border-t border-border p-3 shrink-0 relative"
        >
          {/* ProfileQuickPanel — only when expanded + clicked */}
          {profileOpen && !collapsed && (
            <ProfileQuickPanel
              userName={userName}
              workspaceName={active.name}
              userRole={userRole}
              avatarUrl={avatarUrl ?? null}
              onClose={() => setProfileOpen(false)}
              onLogout={logout}
            />
          )}



          <button
            id="profile-quick-panel-trigger"
            onClick={() => {
              if (collapsed) {
                toggle();
              } else {
                setProfileOpen((o) => !o);
              }
            }}
            className={`w-full flex items-center gap-3 px-1 py-1 rounded-xl transition-colors duration-150 group cursor-pointer ${
              profileOpen && !collapsed ? "bg-accent ring-1 ring-border" : "hover:bg-accent/50"
            }`}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden relative z-10 ring-2 ring-offset-1 ring-transparent group-hover:ring-indigo-300 transition-all">
                {avatarUrl
                  ? <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
                  : initials}
              </div>
            </div>

            {/* Name + workspace (hidden when collapsed) */}
            <div className={`flex-1 min-w-0 text-left overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
              collapsed ? "opacity-0 max-w-0 pointer-events-none" : "opacity-100 max-w-[150px]"
            }`}>
              <div className="text-sm font-semibold truncate text-foreground">{userName}</div>
              <div className="text-xs text-muted-foreground truncate">{active.name}</div>
            </div>

            {/* Chevron hint (expanded only) */}
            {!collapsed && (
              <ChevronLeft
                className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${profileOpen ? "rotate-90" : "-rotate-90"}`}
              />
            )}
          </button>
        </div>
      </aside>

      {/* Collapse toggle — SIBLING of aside, never clipped */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 h-6 w-6 rounded-full border border-border bg-card hover:bg-accent shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-90"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
          : <ChevronLeft className="h-3 w-3 text-muted-foreground" />}
      </button>
    </div>
  );
}
