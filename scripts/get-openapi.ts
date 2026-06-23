import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env variables");
  process.exit(1);
}

async function main() {
  const response = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key as string,
      Authorization: `Bearer ${key}`
    } as HeadersInit
  });
  if (!response.ok) {
    console.error("Fetch failed:", response.statusText);
    return;
  }
  const schema = await response.json();
  console.log("Exposed endpoints/RPCs:", Object.keys(schema.paths));
}

main();
