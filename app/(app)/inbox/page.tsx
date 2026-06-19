import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import Link from "next/link";
import type { Tables, NotificationType } from "@/lib/supabase/types";
import type { ReactNode } from "react";
import {
  CheckCheck, Bell, UserCheck, ThumbsUp, ThumbsDown,
  ClipboardCheck, ClipboardX, Inbox, Sparkles,
} from "lucide-react";

async function markAllRead() {
  "use server";
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id).is("read_at", null);
  revalidatePath("/inbox");
}

async function markOneRead(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id"));
  const supabase = await createSupabaseServerClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/inbox");
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ACCENT: Record<NotificationType, { border: string; bg: string; ring: string }> = {
  task_assignment: { border: "border-l-indigo-500", bg: "bg-indigo-50/60", ring: "bg-indigo-500" },
  approval_request: { border: "border-l-amber-500",  bg: "bg-amber-50/60",  ring: "bg-amber-500"  },
  task_accepted:   { border: "border-l-emerald-500", bg: "bg-emerald-50/60", ring: "bg-emerald-500" },
  task_declined:   { border: "border-l-red-500",    bg: "bg-red-50/60",    ring: "bg-red-500"    },
  task_approved:   { border: "border-l-emerald-500", bg: "bg-emerald-50/60", ring: "bg-emerald-500" },
  task_rejected:   { border: "border-l-red-500",    bg: "bg-red-50/60",    ring: "bg-red-500"    },
  task_completion: { border: "border-l-emerald-500", bg: "bg-emerald-50/60", ring: "bg-emerald-500" },
};

const ICON_BY_TYPE: Record<NotificationType, ReactNode> = {
  task_assignment: <UserCheck className="h-4 w-4 text-indigo-500" />,
  approval_request:<ClipboardCheck className="h-4 w-4 text-amber-500" />,
  task_accepted:   <ThumbsUp className="h-4 w-4 text-emerald-500" />,
  task_declined:   <ThumbsDown className="h-4 w-4 text-red-500" />,
  task_approved:   <ThumbsUp className="h-4 w-4 text-emerald-500" />,
  task_rejected:   <ClipboardX className="h-4 w-4 text-red-500" />,
  task_completion: <ThumbsUp className="h-4 w-4 text-emerald-500" />,
};

type Tab = "all" | "assigned" | "approvals";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "all",       label: "All",           emoji: "📥" },
  { id: "assigned",  label: "Assigned to Me", emoji: "📌" },
  { id: "approvals", label: "Approvals",      emoji: "🛡️" },
];

const EMPTY_MSG: Record<Tab, string> = {
  all:       "Your inbox is empty — you're all caught up!",
  assigned:  "No task assignments yet.",
  approvals: "No approval requests pending.",
};

function NotificationRow({ n }: { n: Tables<"notifications"> }) {
  const isUnread = n.read_at === null;
  const type = n.type as NotificationType;
  const accent = ACCENT[type] ?? { border: "border-l-gray-300", bg: "", ring: "bg-gray-400" };

  const inner = (
    <div
      className={`relative flex items-start gap-4 rounded-2xl border border-border/60 px-5 py-4 border-l-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 card-hover ${accent.border} ${isUnread ? accent.bg : "bg-white/80"}`}
    >
      {/* Icon bubble */}
      <div className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${isUnread ? "bg-white shadow-sm border border-border/50" : "bg-muted/40"}`}>
        {ICON_BY_TYPE[type] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-sm font-semibold truncate ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
            {n.title}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">{timeAgo(n.created_at)}</span>
            {isUnread && (
              <span className={`h-2 w-2 rounded-full shrink-0 animate-pulse ${accent.ring}`} />
            )}
          </div>
        </div>
        {n.body && (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{n.body}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="group relative">
      {n.task_id ? <Link href={`/tasks/${n.task_id}`} className="block">{inner}</Link> : inner}
      {isUnread && (
        <form action={markOneRead} className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <input type="hidden" name="id" value={n.id} />
          <button type="submit" title="Mark as read"
            className="p-1.5 rounded-lg bg-white border border-border shadow-sm hover:bg-indigo-50 hover:border-indigo-200 text-indigo-500 transition-all">
            <CheckCheck className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "assigned" || rawTab === "approvals" ? rawTab : "all";

  const user = await requireUser();
  await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (tab === "assigned")  query = query.eq("type", "task_assignment");
  if (tab === "approvals") query = query.eq("type", "approval_request");

  const { data: notifications } = await query;
  const items = (notifications ?? []) as Tables<"notifications">[];
  const unreadCount = items.filter((n) => n.read_at === null).length;
  const totalCount = items.length;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">

      {/* ── Hero header ── */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-gradient-to-br from-indigo-50 via-white to-violet-50/50 px-6 py-6 shadow-sm animate-fade-up">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-indigo-100/40 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Inbox className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? <><span className="font-semibold text-indigo-600">{unreadCount} unread</span> · {totalCount} total</>
                : "All caught up — no unread notifications"}
            </p>
          </div>

          {unreadCount > 0 && (
            <form action={markAllRead}>
              <button type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95">
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/60 w-fit animate-fade-up delay-100">
        {TABS.map(({ id, label, emoji }) => (
          <Link key={id} href={`/inbox?tab=${id}`}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === id
                ? "bg-white text-primary shadow-sm border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            <span>{emoji}</span>
            {label}
          </Link>
        ))}
      </div>

      {/* ── Notifications list ── */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center animate-fade-up delay-200">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Sparkles className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{EMPTY_MSG[tab]}</p>
            <p className="text-xs text-muted-foreground mt-1">Check back later or create a new task to get started.</p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2.5 animate-fade-up delay-200">
          {items.map((n) => (
            <li key={n.id}>
              <NotificationRow n={n} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
