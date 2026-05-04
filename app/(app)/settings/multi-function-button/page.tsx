import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireActiveBusiness } from "@/lib/auth/session";
import { Card } from "@/components/dashboard/Cards";
import { Button } from "@/components/ui/button";

const ALL_ACTIONS: { key: string; label: string }[] = [
  { key: "task.create",     label: "Create / approve task" },
  { key: "ai.chat",         label: "Talk to AI assistant (coming soon)" },
  { key: "report.generate", label: "Generate report (coming soon)" },
  { key: "calendar.new",    label: "Create calendar event" },
  { key: "member.invite",   label: "Invite a member" },
  { key: "approval.review", label: "Review approvals" },
];

async function save(formData: FormData) {
  "use server";
  const user = await requireUser();
  const active = await requireActiveBusiness();
  const picked: string[] = [];
  for (const a of ALL_ACTIONS) {
    if (formData.get(a.key) === "on") picked.push(a.key);
  }
  if (picked.length > 6) picked.length = 6;

  const supabase = await createSupabaseServerClient();
  await supabase.from("multi_function_button_config").upsert({
    user_id: user.id,
    business_id: active.business.id,
    actions: picked,
  });
  revalidatePath("/settings/multi-function-button");
}

export default async function MFBSettings() {
  const user = await requireUser();
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();
  const { data: cfg } = await supabase
    .from("multi_function_button_config")
    .select("actions")
    .eq("user_id", user.id)
    .eq("business_id", active.business.id)
    .maybeSingle();
  const selected = new Set(Array.isArray(cfg?.actions) ? (cfg.actions as string[]) : []);

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Multi-function button</h1>
      <p className="text-sm text-muted-foreground">Pick up to 6 quick actions. Defaults are used when nothing is selected.</p>

      <Card>
        <form action={save} className="space-y-2">
          {ALL_ACTIONS.map((a) => (
            <label key={a.key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={a.key} defaultChecked={selected.has(a.key)} />
              {a.label}
            </label>
          ))}
          <div className="pt-2"><Button type="submit">Save</Button></div>
        </form>
      </Card>
    </div>
  );
}
