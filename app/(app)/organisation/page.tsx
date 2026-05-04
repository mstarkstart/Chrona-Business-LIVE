import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveBusiness } from "@/lib/auth/session";
import { Card, CardTitle } from "@/components/dashboard/Cards";

export default async function OrganisationOverview() {
  const active = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();

  const [{ count: depts }, { count: teams }, { count: members }] = await Promise.all([
    supabase.from("departments").select("id", { count: "exact", head: true }).eq("business_id", active.business.id),
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("business_id", active.business.id),
    supabase.from("business_members").select("id", { count: "exact", head: true }).eq("business_id", active.business.id).eq("status", "active"),
  ]);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <h1 className="text-2xl font-semibold">Organisation</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/organisation/departments"><Card className="hover:bg-accent transition"><CardTitle>Departments</CardTitle><div className="mt-2 text-3xl font-semibold">{depts ?? 0}</div></Card></Link>
        <Link href="/organisation/teams"><Card className="hover:bg-accent transition"><CardTitle>Teams</CardTitle><div className="mt-2 text-3xl font-semibold">{teams ?? 0}</div></Card></Link>
        <Link href="/organisation/members"><Card className="hover:bg-accent transition"><CardTitle>Members</CardTitle><div className="mt-2 text-3xl font-semibold">{members ?? 0}</div></Card></Link>
      </div>
    </div>
  );
}
