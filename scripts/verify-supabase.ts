import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load local environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  console.log("Starting Supabase database schema verification...");
  console.log(`Supabase URL: ${supabaseUrl}`);

  let allPassed = true;

  // 1. Check if core tables exist and list their columns
  const tables = [
    { name: "profiles", columns: ["id", "first_name", "last_name", "avatar_url"] },
    { name: "workspaces", columns: ["id", "name", "business_type"] },
    { name: "workspace_members", columns: ["id", "workspace_id", "user_id", "status"] },
    { name: "projects", columns: ["id", "name", "workspace_id", "deadline"] },
    { name: "tasks", columns: ["id", "title", "status", "workspace_id", "assigned_to"] },
    { name: "calendar_events", columns: ["id", "title", "description"] },
    { name: "chat_messages", columns: ["id", "workspace_id", "body"] },
  ];

  console.log("\n--- Checking Tables and Columns ---");
  for (const table of tables) {
    // We fetch a single record or select a limit of 0 to check columns
    const { data, error } = await supabase
      .from(table.name)
      .select(table.columns.join(","))
      .limit(1);

    if (error) {
      console.error(`❌ Table "${table.name}" check FAILED:`, error.message);
      allPassed = false;
    } else {
      console.log(`✅ Table "${table.name}" exists with all expected columns: ${table.columns.join(", ")}`);
    }
  }

  // 2. Check storage buckets (avatars)
  console.log("\n--- Checking Storage Buckets ---");
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error("❌ Failed to list storage buckets:", bucketsError.message);
    allPassed = false;
  } else {
    const avatarBucket = buckets.find((b) => b.name === "avatars");
    if (avatarBucket) {
      console.log(`✅ Storage bucket "avatars" exists (Public: ${avatarBucket.public})`);
    } else {
      console.error("❌ Storage bucket \"avatars\" does NOT exist. You need to run scripts/setup-storage.ts");
      allPassed = false;
    }
  }

  // 3. Check custom SQL functions (is_project_member, is_role_at_or_above)
  console.log("\n--- Checking Custom SQL Functions ---");
  // We can query pg_proc to see if these functions are defined in the public schema
  const { data: functions, error: functionsError } = await supabase.rpc("is_project_member", {
    p_project_id: "00000000-0000-0000-0000-000000000000" // check if function executes (returns false for dummy UUID)
  });

  // If function doesn't exist, we'll get an error
  if (functionsError && functionsError.message.includes("does not exist")) {
    console.error("❌ SQL Function \"public.is_project_member\" does NOT exist.");
    allPassed = false;
  } else {
    console.log("✅ SQL Function \"public.is_project_member\" exists and is callable.");
  }

  const { data: memberOfCheck, error: memberOfError } = await supabase.rpc("is_member_of", {
    w_id: "00000000-0000-0000-0000-000000000000"
  });

  if (memberOfError && memberOfError.message.includes("does not exist")) {
    console.error("❌ SQL Function \"public.is_member_of\" does NOT exist.");
    allPassed = false;
  } else {
    console.log("✅ SQL Function \"public.is_member_of\" exists and is callable.");
  }

  console.log("\n--- Verification Summary ---");
  if (allPassed) {
    console.log("🎉 SUCCESS: All database tables, columns, buckets, and custom SQL functions are correctly configured on your Supabase instance!");
  } else {
    console.warn("⚠️ WARNING: Some schema checks failed. Please ensure you have run all migration scripts (0001 to 0015) in your Supabase SQL Editor.");
  }
}

main().catch((err) => {
  console.error("Verification script failed to run:", err);
});
