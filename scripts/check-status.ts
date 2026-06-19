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
  const { data: profiles, error: pError } = await supabase.from("profiles").select("*");
  const { data: members, error: mError } = await supabase.from("workspace_members").select("*");
  const { data: statuses, error: sError } = await supabase.from("activity_status").select("*");

  console.log("PROFILES:");
  console.log(profiles);

  console.log("\nWORKSPACE MEMBERS:");
  console.log(members);

  console.log("\nACTIVITY STATUSES:");
  console.log(statuses);
}

main();
