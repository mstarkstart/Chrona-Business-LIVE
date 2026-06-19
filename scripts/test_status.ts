import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: profile } = await supabase.from('profiles').select('id').eq('personal_email', 'dev1@pixelforge.test').single();
  if (!profile) { console.error("Profile not found"); return; }

  const { data: member } = await supabase.from('workspace_members').select('id').eq('user_id', profile.id).single();
  if (!member) { console.error("Member not found"); return; }

  console.log("Member ID:", member.id);

  const { data, error } = await supabase
    .from("activity_status")
    .upsert(
      { workspace_member_id: member.id, status: "meeting", task_id: null },
      { onConflict: "workspace_member_id" }
    );

  console.log("Upsert result:", { data, error });
}
main();
