import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ChatWindow } from "@/components/chat/ChatWindow";
import type { Message } from "@/components/chat/ChatWindow";

export default async function ChatPage() {
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();

  // Fetch last 50 messages (oldest first for display)
  const [{ data: rawMessages }, { count: memberCount }] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("id, user_id, body, created_at")
      .eq("workspace_id", active.workspace.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", active.workspace.id)
      .eq("status", "active"),
  ]);

  const messages = (rawMessages ?? []).reverse();

  // Resolve unique author names
  const authorIds = [...new Set(messages.map((m) => m.user_id))];
  const { data: profiles } = authorIds.length > 0
    ? await supabaseAdmin
        .from("profiles")
        .select("id, first_name, last_name, preferred_name")
        .in("id", authorIds)
    : { data: [] };

  const nameOf = (uid: string): string => {
    const p = profiles?.find((x) => x.id === uid);
    if (!p) return "Member";
    return (
      (p as { preferred_name?: string | null }).preferred_name ??
      ([(p as { first_name?: string | null }).first_name, (p as { last_name?: string | null }).last_name]
        .filter(Boolean)
        .join(" ") || "Member")
    );
  };

  const initialMessages: Message[] = messages.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    body: m.body,
    created_at: m.created_at,
    author_name: nameOf(m.user_id),
  }));

  const myName =
    user.profile
      ? ((user.profile as { preferred_name?: string | null }).preferred_name ??
        ([
          (user.profile as { first_name?: string | null }).first_name,
          (user.profile as { last_name?: string | null }).last_name,
        ]
          .filter(Boolean)
          .join(" ") || "Me"))
      : "Me";

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 57px)" }}>
      {/* Page header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-sm">💬</span>
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">Team Chat</h1>
            <p className="text-xs text-muted-foreground">{active.workspace.name} · All members</p>
          </div>
        </div>
      </div>

      {/* Chat window fills remaining height */}
      <div className="flex-1 min-h-0">
        <ChatWindow
          workspaceId={active.workspace.id}
          currentUserId={user.id}
          currentUserName={myName}
          initialMessages={initialMessages}
          memberCount={memberCount ?? undefined}
        />
      </div>
    </div>
  );
}
