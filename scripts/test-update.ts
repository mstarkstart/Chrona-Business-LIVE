import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  // Sign in as owner
  console.log("Signing in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "newowner@pixelforge.test",
    password: "TestPass123!"
  });

  if (authError) {
    console.error("Auth error:", authError);
    return;
  }

  const user = authData.user;
  console.log("Signed in successfully as:", user.email, "id:", user.id);

  // Get active workspace membership
  const { data: memberRows, error: memberError } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("user_id", user.id);

  if (memberError) {
    console.error("Member fetch error:", memberError);
    return;
  }

  console.log("Workspace memberships for this user:", memberRows);

  if (!memberRows || memberRows.length === 0) {
    console.error("No memberships found!");
    return;
  }

  const activeMember = memberRows[0];
  console.log("Using workspace member ID:", activeMember.id);

  // Attempt the status upsert
  console.log("Attempting upsert to activity_status...");
  const { data: upsertData, error: upsertError } = await supabase
    .from("activity_status")
    .upsert({
      workspace_member_id: activeMember.id,
      status: "offline"
    });

  if (upsertError) {
    console.error("Upsert error details:", upsertError);
  } else {
    console.log("Upsert succeeded!", upsertData);
  }
}

main();
