/* eslint-disable @typescript-eslint/no-explicit-any */
// Seed two demo workspaces with realistic data.
// Idempotent: run twice and you don't get duplicates.
//
// Usage: npm run seed
// Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const PASSWORD = "TestPass123!";

type SeedUser = {
  email: string;
  first: string;
  last: string;
  role: "owner" | "admin" | "manager" | "manager" | "member";
  position: string;
  department?: string;
  team?: string;
  contract_type?: "full_time" | "contract_3m" | "contract_6m" | "contract_12m" | "custom";
  partnerShare?: number;
};

const PIXELFORGE: SeedUser[] = [
  { email: "owner@pixelforge.test",         first: "Olivia",  last: "Carter",  role: "owner",  position: "Founder & CEO" },
  { email: "cto@pixelforge.test",           first: "Marcus",  last: "Lee",     role: "admin",   position: "CTO", department: "Engineering" },
  { email: "coo@pixelforge.test",           first: "Priya",   last: "Shah",    role: "admin",   position: "COO" },
  { email: "design.lead@pixelforge.test",   first: "Hana",    last: "Mori",    role: "manager",   position: "Design Manager", department: "Design" },
  { email: "eng.lead@pixelforge.test",      first: "Diego",   last: "Alvarez", role: "manager",   position: "Eng Manager", department: "Engineering" },
  { email: "frontend.lead@pixelforge.test", first: "Sam",     last: "Park",    role: "manager", position: "Frontend Team Lead", department: "Engineering", team: "Frontend" },
  { email: "designer1@pixelforge.test",     first: "Zoe",     last: "Walker",  role: "member",  position: "Senior Designer", department: "Design" },
  { email: "designer2@pixelforge.test",     first: "Niko",    last: "Iversen", role: "member",  position: "Designer",        department: "Design" },
  { email: "dev1@pixelforge.test",          first: "Aiden",   last: "Brooks",  role: "member",  position: "Frontend Dev",   department: "Engineering", team: "Frontend" },
  { email: "dev2@pixelforge.test",          first: "Ravi",    last: "Kapoor",  role: "member",  position: "Backend Dev",    department: "Engineering", team: "Backend" },
  { email: "dev3@pixelforge.test",          first: "Lena",    last: "Hofmann", role: "member",  position: "Frontend Dev",   department: "Engineering", team: "Frontend" },
  { email: "sales1@pixelforge.test",        first: "Cleo",    last: "Tanaka",  role: "member",  position: "Sales",          department: "Sales" },
];

const BELLA: SeedUser[] = [
  { email: "bella@bellasauto.test",     first: "Bella",  last: "Romano",  role: "owner", position: "Co-owner",     partnerShare: 60 },
  { email: "marco@bellasauto.test",     first: "Marco",  last: "Conti",   role: "owner", position: "Co-owner",     partnerShare: 40 },
  { email: "manager@bellasauto.test",   first: "Tomas",  last: "Vega",    role: "manager",  position: "Shop Manager" },
  { email: "mech1@bellasauto.test",     first: "Aria",   last: "Singh",   role: "member", position: "Senior Mechanic" },
  { email: "mech2@bellasauto.test",     first: "Jonas",  last: "Becker",  role: "member", position: "Mechanic" },
  { email: "mech3@bellasauto.test",     first: "Mira",   last: "Ali",     role: "member", position: "Junior Mechanic" },
  { email: "frontdesk@bellasauto.test", first: "Iris",   last: "Wells",   role: "member", position: "Front Desk" },
  { email: "apprentice@bellasauto.test",first: "Theo",   last: "Klein",   role: "member", position: "Apprentice", contract_type: "contract_3m" },
];

async function ensureUser(u: SeedUser): Promise<string> {
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing.users.find((x) => x.email === u.email);
  
  let userId: string;
  if (found) {
    userId = found.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: u.first, last_name: u.last },
    });
    if (error || !data.user) throw error;
    userId = data.user.id;
  }
  
  await supabase.from("profiles").upsert({
    id: userId,
    first_name: u.first,
    last_name: u.last,
    personal_email: u.email
  });

  return userId;
}

async function ensureBusiness(name: string, type: "corporation" | "partnership", ownerId: string) {
  const { data: existing } = await supabase.from("workspaces").select("*").eq("name", name).maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase.from("workspaces").insert({
    name,
    business_type: type,
    industry: type === "partnership" ? "Automotive" : "Tech",
    services: type === "partnership" ? "Automotive repair" : "Web design",
    employee_count_estimate: type === "partnership" ? 8 : 12,
    team_count_estimate: type === "partnership" ? 2 : 4,
    partnership_requires_approval: type === "partnership",
    created_by: ownerId,
  }).select().single();
  if (error) throw error;
  return data;
}

async function ensureDepartment(businessId: string, name: string): Promise<string> {
  const { data: existing } = await supabase.from("departments").select("id").eq("workspace_id", businessId).eq("name", name).maybeSingle();
  if (existing) return existing.id;
  const { data } = await supabase.from("departments").insert({ workspace_id: businessId, name }).select().single();
  return data!.id;
}

async function ensureTeam(businessId: string, departmentId: string | null, name: string): Promise<string> {
  const { data: existing } = await supabase.from("teams").select("id").eq("workspace_id", businessId).eq("name", name).maybeSingle();
  if (existing) return existing.id;
  const { data } = await supabase.from("teams").insert({ workspace_id: businessId, department_id: departmentId, name }).select().single();
  return data!.id;
}

async function ensureMember(businessId: string, userId: string, u: SeedUser, deptId: string | null, teamId: string | null) {
  const { data: existing } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase.from("workspace_members").insert({
    workspace_id: businessId,
    user_id: userId,
    role: u.role,
    position: u.position,
    department_id: deptId,
    team_id: teamId,
    contract_type: u.contract_type ?? "full_time",
    is_owner: u.role === "owner",
    status: "active",
    date_joined: new Date(Date.now() - Math.floor(Math.random() * 365) * 86400000).toISOString().slice(0, 10),
    company_email: u.email.replace(".test", ".io"),
  }).select().single();

  if (error) {
    console.error("Failed to insert business member:", error);
    throw error;
  }

  await supabase.from("activity_status").upsert({
    workspace_member_id: data!.id,
    status: ["available","tasking","meeting","lunch_break","personal_time","training"][Math.floor(Math.random()*6)] as any,
  });

  return data!.id;
}

async function seedTasks(businessId: string, userIds: string[]) {
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", businessId);
  if ((count ?? 0) > 0) return;

  const now = Date.now();
  const titles = [
    "Refactor onboarding flow", "Q3 roadmap proposal", "Customer demo prep", "Bug triage",
    "Design system audit", "Hiring loop sync", "Migrate to v2 API", "Marketing copy review",
    "Update pricing page", "Performance regression", "Sprint retro", "Code review backlog",
    "Compliance docs", "Vendor renewal", "Team offsite plan", "Stakeholder check-in",
    "Inventory audit", "Quarterly forecast", "Customer feedback synthesis", "Launch checklist",
    "Brand refresh", "Security review", "Data pipeline upgrade", "Onboard new hire",
    "Refresh investor deck", "Process documentation", "Bugfix backlog", "QA cycle",
    "Outage post-mortem", "Release notes",
  ];
  const priorities = ["low","normal","high","urgent"] as const;
  const statuses = ["pending","in_progress","completed","awaiting_approval"] as const;

  const rows = titles.map((title, i) => {
    const created = userIds[i % userIds.length];
    const assigned = Math.random() > 0.2 ? userIds[(i * 3) % userIds.length] : null;
    const offsetDays = (i % 28) - 14;
    const due = new Date(now + offsetDays * 86400000);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    return {
      workspace_id: businessId,
      title,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      status,
      assigned_to: assigned,
      created_by: created,
      due_date: due.toISOString(),
      completed_at: status === "completed" ? new Date(due.getTime() - 3600_000).toISOString() : null,
      requires_approval: status === "awaiting_approval",
    };
  });
  await supabase.from("tasks").insert(rows as any);
}

async function seedEvents(businessId: string, userIds: string[]) {
  const { count } = await supabase
    .from("calendar_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", businessId);
  if ((count ?? 0) > 0) return;

  const types = ["meeting","task_block","break","lunch","focus","training"] as const;
  const rows: any[] = [];
  const today = new Date();
  for (let day = -1; day < 14; day++) {
    for (const uid of userIds) {
      const eventCount = Math.floor(Math.random() * 3) + 1;
      for (let e = 0; e < eventCount; e++) {
        const startHour = 9 + Math.floor(Math.random() * 7);
        const start = new Date(today);
        start.setDate(start.getDate() + day);
        start.setHours(startHour, 0, 0, 0);
        const end = new Date(start.getTime() + (30 + Math.floor(Math.random() * 4) * 30) * 60000);
        rows.push({
          workspace_id: businessId,
          owner_id: uid,
          title: `${types[e % types.length]} block`.replace(/_/g, " "),
          event_type: types[e % types.length],
          start_at: start.toISOString(),
          end_at: end.toISOString(),
        });
      }
    }
  }
  await supabase.from("calendar_events").insert(rows);
}

async function seedApprovals(businessId: string, requesterId: string) {
  const { count } = await supabase
    .from("approval_requests")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", businessId);
  if ((count ?? 0) > 0) return;

  await supabase.from("approval_requests").insert([
    { workspace_id: businessId, requested_by: requesterId, action_type: "add_department", payload: { name: "Detailing" } },
    { workspace_id: businessId, requested_by: requesterId, action_type: "modify_member_role", payload: { note: "Promote Marco to operations lead" } },
  ]);
}

async function main() {
  console.log("→ Seeding Pixelforge Studio (corporation)…");
  const ownerId = await ensureUser(PIXELFORGE[0]);
  const pixel = await ensureBusiness("Pixelforge Studio", "corporation", ownerId);

  const pixelDepts: Record<string, string> = {};
  for (const d of ["Engineering","Design","Sales"]) pixelDepts[d] = await ensureDepartment(pixel.id, d);
  const pixelTeams: Record<string, string> = {};
  pixelTeams["Frontend"] = await ensureTeam(pixel.id, pixelDepts["Engineering"], "Frontend");
  pixelTeams["Backend"]  = await ensureTeam(pixel.id, pixelDepts["Engineering"], "Backend");

  const pixelUserIds: string[] = [];
  for (const u of PIXELFORGE) {
    const uid = await ensureUser(u);
    pixelUserIds.push(uid);
    await ensureMember(
      pixel.id,
      uid,
      u,
      u.department ? pixelDepts[u.department] ?? null : null,
      u.team ? pixelTeams[u.team] ?? null : null
    );
  }
  await seedTasks(pixel.id, pixelUserIds);
  await seedEvents(pixel.id, pixelUserIds.slice(0, 6));

  console.log("→ Seeding Bella's Auto (partnership)…");
  const bellaOwnerId = await ensureUser(BELLA[0]);
  const bella = await ensureBusiness("Bella's Auto", "partnership", bellaOwnerId);

  const bellaUserIds: string[] = [];
  for (const u of BELLA) {
    const uid = await ensureUser(u);
    bellaUserIds.push(uid);
    await ensureMember(bella.id, uid, u, null, null);
    if (u.partnerShare) {
      const { data: existing } = await supabase
        .from("partners").select("id").eq("workspace_id", bella.id).eq("user_id", uid).maybeSingle();
      if (!existing) {
        await supabase.from("partners").insert({
          workspace_id: bella.id, user_id: uid, share_percentage: u.partnerShare,
        });
      }
    }
  }
  await seedTasks(bella.id, bellaUserIds);
  await seedEvents(bella.id, bellaUserIds.slice(0, 4));
  await seedApprovals(bella.id, bellaOwnerId);

  // Token-format invitation for testing /invite/[token].
  const { data: existingInvite } = await supabase
    .from("invitations").select("id").eq("workspace_id", pixel.id).eq("email", "demo.invitee@pixelforge.test").maybeSingle();
  if (!existingInvite) {
    const token = randomBytes(24).toString("hex");
    await supabase.from("invitations").insert({
      workspace_id: pixel.id,
      email: "demo.invitee@pixelforge.test",
      role: "member",
      token,
      invited_by: ownerId,
    });
    console.log(`   demo invite token: ${token}`);
  }

  console.log("\n✅ Seeded 2 workspaces + " + (PIXELFORGE.length + BELLA.length) + " users");
  console.log("🔑 Login with any (password: TestPass123!):");
  console.log("   - owner@pixelforge.test (Employer, Pixelforge Studio)");
  console.log("   - bella@bellasauto.test (Partner-Employer, Bella's Auto)");
  console.log("   - dev1@pixelforge.test  (Employee, Frontend Team)");
  console.log("   - mech1@bellasauto.test (Employee, Bella's Auto)");
}

main().catch((e) => { console.error(e); process.exit(1); });
