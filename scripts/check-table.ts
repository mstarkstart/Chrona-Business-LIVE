import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url!, key!);

async function main() {
  const { data, error } = await supabase.from("calendar_events").select("*").limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("calendar_events fields:", data && data[0] ? Object.keys(data[0]) : "No records found");
  }
}
main();
