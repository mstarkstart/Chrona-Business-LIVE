import "server-only";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SetupState } from "./setup";

export async function finalizeSignup(state: SetupState): Promise<{ userId: string; businessId: string }> {
  if (!state.business) throw new Error("Missing business step");
  if (!state.account) throw new Error("Missing account step");

  const b = state.business;
  const a = state.account;

  // 1. Create the auth user (or sign in if already exists with the password).
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: a.personal_email,
    password: a.password,
    email_confirm: true,
    user_metadata: {
      first_name: a.first_name,
      last_name: a.last_name,
    },
  });
  if (createErr || !created.user) throw new Error(createErr?.message ?? "User creation failed");
  const userId = created.user.id;

  // 2. Upsert profile (handle_new_user trigger created it, fill fields).
  const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    first_name: a.first_name,
    last_name: a.last_name,
    preferred_name: a.preferred_name || null,
    date_of_birth: a.date_of_birth || null,
    gender: a.gender || null,
    pronouns: a.pronouns || null,
    personal_email: a.personal_email,
    personal_phone: a.personal_phone || null,
  });
  if (profileErr) throw profileErr;

  // 3. Create the business.
  const { data: biz, error: bizErr } = await supabaseAdmin
    .from("businesses")
    .insert({
      name: b.name,
      founding_date: b.founding_date || null,
      business_type: b.business_type,
      industry: b.industry || null,
      services: b.services || null,
      employee_count_estimate: b.employee_count_estimate,
      team_count_estimate: b.team_count_estimate,
      partnership_requires_approval: b.business_type === "partnership",
      created_by: userId,
    })
    .select()
    .single();
  if (bizErr || !biz) throw bizErr ?? new Error("Business insert failed");

  // 4. Optional department / team for the founder.
  let departmentId: string | null = null;
  let teamId: string | null = null;
  if (a.department_name) {
    const { data: dept } = await supabaseAdmin
      .from("departments")
      .insert({ business_id: biz.id, name: a.department_name })
      .select()
      .single();
    departmentId = dept?.id ?? null;
  }
  if (a.team_name) {
    const { data: team } = await supabaseAdmin
      .from("teams")
      .insert({ business_id: biz.id, department_id: departmentId, name: a.team_name })
      .select()
      .single();
    teamId = team?.id ?? null;
  }

  // 5. Founding member row.
  const { data: founderMember, error: memberErr } = await supabaseAdmin
    .from("business_members")
    .insert({
      business_id: biz.id,
      user_id: userId,
      role: "employer",
      position: a.position || "Founder",
      department_id: departmentId,
      team_id: teamId,
      date_joined: a.date_joined || new Date().toISOString().slice(0, 10),
      company_email: a.company_email || null,
      work_phone: a.work_phone || null,
      is_owner: a.is_owner,
      contract_type: "full_time",
      status: "active",
    })
    .select()
    .single();
  if (memberErr || !founderMember) throw memberErr ?? new Error("Member insert failed");

  // Initialise activity_status for the founder.
  await supabaseAdmin.from("activity_status").upsert({
    business_member_id: founderMember.id,
    status: "available",
  });

  // 6. Partnership partners.
  if (b.business_type === "partnership" && a.partners.length > 0) {
    await supabaseAdmin.from("partners").insert({
      business_id: biz.id,
      user_id: userId,
      share_percentage: a.partners.reduce((acc, p) => acc + p.share_percentage, 0) < 100
        ? 100 - a.partners.reduce((acc, p) => acc + p.share_percentage, 0)
        : null,
    });
    for (const partner of a.partners) {
      const token = randomBytes(24).toString("hex");
      await supabaseAdmin.from("invitations").insert({
        business_id: biz.id,
        email: partner.email,
        role: "employer",
        token,
        invited_by: userId,
      });
      // Note: partners row gets created when they accept the invitation.
    }
  }

  // 7. Employee invitations (if any).
  if (state.employees && state.employees.length > 0) {
    for (const emp of state.employees) {
      const token = randomBytes(24).toString("hex");

      let empDeptId: string | null = null;
      let empTeamId: string | null = null;
      if (emp.department) {
        const { data: dept } = await supabaseAdmin
          .from("departments")
          .select("id")
          .eq("business_id", biz.id)
          .eq("name", emp.department)
          .maybeSingle();
        if (dept) empDeptId = dept.id;
        else {
          const { data: newDept } = await supabaseAdmin
            .from("departments")
            .insert({ business_id: biz.id, name: emp.department })
            .select("id")
            .single();
          empDeptId = newDept?.id ?? null;
        }
      }
      if (emp.team) {
        const { data: team } = await supabaseAdmin
          .from("teams")
          .select("id")
          .eq("business_id", biz.id)
          .eq("name", emp.team)
          .maybeSingle();
        if (team) empTeamId = team.id;
        else {
          const { data: newTeam } = await supabaseAdmin
            .from("teams")
            .insert({ business_id: biz.id, department_id: empDeptId, name: emp.team })
            .select("id")
            .single();
          empTeamId = newTeam?.id ?? null;
        }
      }

      await supabaseAdmin.from("invitations").insert({
        business_id: biz.id,
        email: emp.personal_email,
        role: emp.role,
        department_id: empDeptId,
        team_id: empTeamId,
        position: emp.position,
        contract_type: emp.contract_type,
        contract_end_date: emp.contract_end_date,
        token,
        invited_by: userId,
      });
    }
  }

  return { userId, businessId: biz.id };
}
