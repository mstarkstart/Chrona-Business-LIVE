// Removes auth users that don't have any workspace_members rows — these are
// "ghost" accounts left behind by half-finished signups. Running this lets a
// stuck user retry signup with the same email.
//
// Usage: npx tsx scripts/cleanup_orphan_users.ts

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

(async () => {
  const { data: usersResp } = await sb.auth.admin.listUsers();
  const users = usersResp.users;
  console.log(`Scanning ${users.length} auth users…`);

  for (const u of users) {
    if (!u.email) continue;

    // Skip seeded test users.
    if (u.email.endsWith(".test")) continue;

    const { data: memberships } = await sb
      .from("workspace_members")
      .select("id")
      .eq("user_id", u.id);

    if (!memberships || memberships.length === 0) {
      console.log(`  removing orphan ${u.email} (${u.id})`);
      await sb.auth.admin.deleteUser(u.id);
    } else {
      console.log(`  keeping ${u.email} (${memberships.length} memberships)`);
    }
  }
  console.log("Done.");
})();
