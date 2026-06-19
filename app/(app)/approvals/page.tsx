import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveWorkspace } from "@/lib/auth/session";
import { Card, CardTitle } from "@/components/dashboard/Cards";
import { Button } from "@/components/ui/button";

async function decide(formData: FormData) {
  "use server";
  const user = await requireUser();
  const active = await requireActiveWorkspace();
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")) as "approved" | "rejected";

  const supabase = await createSupabaseServerClient();
  const { data: req } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", active.workspace.id)
    .maybeSingle();
  if (!req) return;

  await supabase
    .from("approval_requests")
    .update({ status: decision, decided_by: user.id, decided_at: new Date().toISOString() })
    .eq("id", id);

  // Execute the side effect of approval here.
  if (decision === "approved") {
    if (req.action_type === "add_department") {
      const payload = req.payload as { name?: string };
      if (payload.name) {
        await supabase.from("departments").insert({
          workspace_id: active.workspace.id,
          name: payload.name,
        });
      }
    } else if (req.action_type === "remove_team") {
      const payload = req.payload as { team_id?: string };
      if (payload.team_id) {
        await supabase.from("teams").delete().eq("id", payload.team_id);
      }
    } else if (req.action_type === "modify_member_role") {
      const payload = req.payload as { member_id?: string; role?: "owner" | "admin" | "manager" | "manager" | "member" };
      if (payload.member_id && payload.role) {
        await supabase.from("workspace_members").update({ role: payload.role }).eq("id", payload.member_id);
      }
    }
  }

  revalidatePath("/approvals");
}

export default async function ApprovalsPage() {
  const active = await requireActiveWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data: pending } = await supabase
    .from("approval_requests")
    .select("*, requester:profiles!approval_requests_requested_by_profiles_fkey(first_name, last_name)")
    .eq("workspace_id", active.workspace.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Approvals</h1>

      {(pending ?? []).length === 0 && (
        <Card><p className="text-sm text-muted-foreground italic">No pending approvals.</p></Card>
      )}

      {(pending ?? []).map((p) => {
        const r = (p as unknown as { requester?: { first_name?: string; last_name?: string } }).requester;
        return (
          <Card key={p.id}>
            <CardTitle>{p.action_type.replace(/_/g, " ")}</CardTitle>
            <p className="mt-2 text-sm">
              Requested by <strong>{[r?.first_name, r?.last_name].filter(Boolean).join(" ") || "Member"}</strong> · {new Date(p.created_at).toLocaleDateString()}
            </p>
            <div className="mt-2 rounded-xl bg-muted/60 border border-border px-4 py-3 text-sm space-y-1">
              {Object.entries(p.payload as Record<string, unknown>).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-muted-foreground capitalize min-w-[120px]">{k.replace(/_/g, " ")}:</span>
                  <span className="font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <form action={decide}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="decision" value="approved" /><Button>Approve</Button></form>
              <form action={decide}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="decision" value="rejected" /><Button variant="outline">Reject</Button></form>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
