import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("Seeding test accounts...");

  const accounts = [
    { email: "oliver@chrona.test", password: "Password123!", firstName: "Oliver", lastName: "Tester", role: "owner" },
    { email: "aidenb@chrona.test", password: "Password123!", firstName: "Aiden", lastName: "B", role: "admin" },
  ];

  const createdUsers = [];

  for (const acc of accounts) {
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true,
      user_metadata: { first_name: acc.firstName, last_name: acc.lastName },
    });

    if (authErr && (authErr as any).code !== "email_exists") {
      console.error(`Failed to create ${acc.email}:`, authErr);
      continue;
    }

    // Get user id (whether just created or existing)
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const user = usersData.users.find((u) => u.email === acc.email);
    if (user) {
      createdUsers.push({ ...acc, id: user.id });
      console.log(`User ready: ${acc.email} (ID: ${user.id})`);
    }
  }

  if (createdUsers.length < 2) {
    console.log("Could not prepare both users. Exiting.");
    return;
  }

  const oliver = createdUsers[0];
  const aiden = createdUsers[1];

  // Create Workspace for Oliver if not exists
  let workspaceId;
  const { data: existingWp } = await supabase
    .from("workspaces")
    .select("id")
    .eq("name", "Chrona Testing Workspace")
    .maybeSingle();

  if (existingWp) {
    workspaceId = existingWp.id;
    console.log("Using existing workspace:", workspaceId);
  } else {
    const { data: wpData, error: wpErr } = await supabase
      .from("workspaces")
      .insert({ 
        name: "Chrona Testing Workspace",
        business_type: "corporation",
        employee_count_estimate: 10
      })
      .select("id")
      .single();
    if (wpErr) throw wpErr;
    workspaceId = wpData.id;
    console.log("Created new workspace:", workspaceId);
  }

  // Add Oliver as owner
  const { error: oErr } = await supabase
    .from("workspace_members")
    .upsert({
      workspace_id: workspaceId,
      user_id: oliver.id,
      role: "owner",
      status: "active",
      contract_type: "full_time"
    }, { onConflict: "workspace_id,user_id" });
  if (oErr) console.error("Error adding Oliver:", oErr);

  // Add Aiden as admin
  const { error: aErr } = await supabase
    .from("workspace_members")
    .upsert({
      workspace_id: workspaceId,
      user_id: aiden.id,
      role: "admin",
      status: "active",
      contract_type: "full_time"
    }, { onConflict: "workspace_id,user_id" });
  if (aErr) console.error("Error adding Aiden:", aErr);

  console.log("=========================================");
  console.log("SEEDING COMPLETE!");
  console.log("Account 1: oliver@chrona.test / Password123!");
  console.log("Account 2: aidenb@chrona.test / Password123!");
  console.log("=========================================");
}

main().catch(console.error);
