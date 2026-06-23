"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Home, ClipboardList, Clock, Folder, Calendar, MessageSquare, Inbox, Building2, FileText, Settings, ShieldAlert } from "lucide-react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { ProfileQuickPanel } from "./ProfileQuickPanel";
import { STATUS_COLOUR } from "@/lib/realtime/presence";
import { supabase } from "@/lib/supabase/client";
import type { ActivityStatus } from "@/lib/supabase/types";

const NAV_MAIN = [
  { href: "/dashboard",  label: "Home",         Icon: Home },
  { href: "/tasks",      label: "My Work",      Icon: ClipboardList },
  { href: "/timesheets", label: "Time Tracking", Icon: Clock },
  { href: "/projects",   label: "Projects",     Icon: Folder },
  { href: "/calendar",   label: "Calendar",     Icon: Calendar },
  { href: "/chat",       label: "Chat",         Icon: MessageSquare },
  { href: "/inbox",      label: "Inbox",        Icon: Inbox },
];

const NAV_BOTTOM = [
  { href: "/organisation", label: "Organisation", Icon: Building2 },
  { href: "/docs",         label: "Docs",         Icon: FileText },
  { href: "/settings",     label: "Settings",     Icon: Settings },
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
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
    if (pathname === "/chat") {
      setHasUnreadChat(false);
      localStorage.setItem(`chrona-chat-read-${active.id}`, Date.now().toString());
    }
  }, [pathname, active.id]);

  useEffect(() => {
    setCurrentStatus(myStatus);
  }, [myStatus]);

  useEffect(() => {
    async function check() {
      if (pathnameRef.current === "/chat") return;
      const lastRead = Number(localStorage.getItem(`chrona-chat-read-${active.id}`) || "0");
      const { data } = await supabase
        .from("chat_messages")
        .select("created_at")
        .eq("workspace_id", active.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data && new Date(data.created_at).getTime() > lastRead) {
        setHasUnreadChat(true);
      }
    }
    check();

    const channel = supabase
      .channel(`chat-notif-${active.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `workspace_id=eq.${active.id}` },
        () => {
          if (pathnameRef.current !== "/chat") setHasUnreadChat(true);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [active.id]);

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
      ? [{ href: "/approvals", label: `Approvals (${pendingApprovals})`, Icon: ShieldAlert }]
      : []),
  ];

  function NavItem({ href, label, Icon, badge }: { href: string; label: string; Icon: React.ElementType; badge?: number }) {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={`group/nav flex items-center relative rounded-[10px] transition-all cursor-pointer py-2.5 btn-press ${
          isActive
            ? "bg-white/88 text-[#1E2D3D] font-semibold text-[14px] shadow-[0_2px_10px_rgba(80,120,160,0.14),inset_0_1px_0_rgba(255,255,255,0.90)] border border-white/70 duration-200"
            : "text-[#344B63] text-[14px] font-medium hover:text-[#1E2D3D] hover:bg-white/40 hover:shadow-[0_1px_6px_rgba(100,140,180,0.08)] duration-150"
        } ${collapsed ? "justify-center px-0" : "px-3"}`}
      >
        <span className={`shrink-0 transition-all duration-300 ease-in-out ${collapsed ? "mr-0" : "mr-3"}`}>
          <Icon className={`h-[18px] w-[18px] stroke-[1.5] fill-none transition-transform duration-200 ${isActive ? "text-[#1E2D3D]" : "text-[#40566E] group-hover/nav:text-[#344B63] group-hover/nav:scale-[1.08]"}`} />
        </span>
        <span className={`overflow-hidden whitespace-nowrap flex-1 transition-all duration-300 ease-in-out ${
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
      <aside className="h-full flex flex-col bg-[rgba(240,246,252,0.72)] backdrop-blur-[28px] border-r border-[rgba(200,220,235,0.40)] shadow-[inset_-1px_0_0_rgba(180,210,230,0.40)] w-full overflow-hidden">

        {/* Logo + workspace switcher */}
        <div className={`border-b border-border flex flex-col gap-3 overflow-visible shrink-0 transition-all duration-300 ${collapsed ? "p-3 items-center" : "p-4"}`}>
          <Link href="/dashboard" className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${collapsed ? "justify-center" : ""}`}>
            <img
              src="/chrona-logo.png"
              alt="Chrona Logo"
              className="h-7 w-7 object-contain shrink-0 rounded-lg shadow-sm"
            />
            <span className={`font-bold text-sm tracking-tight text-foreground overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
              collapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100 max-w-[150px]"
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
              Icon={item.Icon}
              badge={item.href === "/inbox" ? unreadNotifications : (item.href === "/chat" && hasUnreadChat ? 1 : undefined)}
            />
          ))}
          <div className="my-2 border-t border-border" />
          {NAV_BOTTOM.map((item) => (
            <NavItem key={item.href} href={item.href} label={item.label} Icon={item.Icon} />
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
            className={`w-full flex items-center rounded-[10px] transition-all duration-150 group cursor-pointer btn-press ${
              profileOpen && !collapsed ? "bg-white/35 ring-1 ring-white/60" : "hover:bg-white/35"
            } ${collapsed ? "justify-center p-2" : "gap-3 px-2 py-1.5"}`}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="h-8 w-8 rounded-full bg-[#4A90D4] text-white font-semibold text-sm shadow-[0_2px_8px_rgba(74,144,212,0.30)] flex items-center justify-center overflow-hidden relative z-10 ring-2 ring-offset-1 ring-transparent group-hover:ring-indigo-300 transition-all">
                {avatarUrl
                  ? <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
                  : initials}
              </div>
            </div>

            {/* Name + workspace (hidden when collapsed) */}
            <div className={`flex-1 min-w-0 text-left overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
              collapsed ? "opacity-0 max-w-0 pointer-events-none" : "opacity-100 max-w-[150px]"
            }`}>
              <div className="text-[14px] font-medium text-[#1E2D3D] truncate">{userName}</div>
              <div className="text-[12px] text-[#40566E] truncate">{active.name}</div>
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
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-[10px] bg-white/50 border border-white/65 text-[#344B63] hover:bg-white/72 hover:text-[#1E2D3D] shadow-[0_1px_5px_rgba(100,140,180,0.10),inset_0_1px_0_rgba(255,255,255,0.85)] flex items-center justify-center active:scale-[0.88] transition-all duration-130 ease-[cubic-bezier(0.34,1.56,0.64,1)] btn-press"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
          : <ChevronLeft className="h-3 w-3 text-muted-foreground" />}
      </button>
    </div>
  );
}
