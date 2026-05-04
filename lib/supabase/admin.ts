import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Lazy service-role client. Bypasses RLS — only for trusted server-only flows
// (signup wizard founding-member insert, invitation token verification, seed).
// Constructed on first use so the module can load during `next build` even when
// SUPABASE_SERVICE_ROLE_KEY isn't present (e.g. local CI).
//
// Never import this from a Client Component.

let cached: SupabaseClient<Database> | null = null;

function build(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "supabaseAdmin: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var"
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const supabaseAdmin: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_t, prop) {
    if (!cached) cached = build();
    return Reflect.get(cached, prop, cached);
  },
});
