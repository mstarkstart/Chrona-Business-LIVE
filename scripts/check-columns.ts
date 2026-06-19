import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: workspaces, error } = await supabase.from("workspaces").select("*").limit(1);
  if (error) {
    console.error("Error fetching workspaces:", error);
  } else {
    console.log("Workspaces first record fields:", workspaces && workspaces[0] ? Object.keys(workspaces[0]) : "No workspaces found");
    console.log("Workspaces record:", workspaces?.[0]);
  }
}

main();
