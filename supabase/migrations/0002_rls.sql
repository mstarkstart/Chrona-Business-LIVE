-- Chrona Business — Row Level Security policies
-- Per newprompt.md §3.3: every business-scoped table is filtered by membership.
-- A query from Business A must be physically incapable of returning Business B's rows.
-- Role hierarchy (rank): employer 5 > c_suite 4 > manager 3 > team_lead 2 > employee 1.

-- ═══════════════════════════════════════════════════════════════════════════
-- businesses
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.businesses enable row level security;

-- Members can see their own businesses.
create policy businesses_select on public.businesses
for select to authenticated
using (public.is_member_of(id));

-- Any authenticated user can create a business (they become the founding employer).
create policy businesses_insert on public.businesses
for insert to authenticated
with check (auth.uid() = created_by);

-- Only employer can edit business profile.
create policy businesses_update on public.businesses
for update to authenticated
using (public.is_role_at_or_above(id, 'employer'))
with check (public.is_role_at_or_above(id, 'employer'));

-- No one deletes a business via the API in v1 (lifecycle handled out-of-band).
-- (No delete policy → delete is denied for non-superusers.)

comment on policy businesses_select on public.businesses is
  'Members see only the businesses they belong to.';

-- ═══════════════════════════════════════════════════════════════════════════
-- profiles
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.profiles enable row level security;

-- A user always sees their own profile.
-- They also see profiles of co-members in any of their businesses (sidebars, member lists).
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.business_members me
    join public.business_members other
      on other.business_id = me.business_id
    where me.user_id = auth.uid()
      and me.status = 'active'
      and other.user_id = profiles.id
  )
);

create policy profiles_insert on public.profiles
for insert to authenticated
with check (id = auth.uid());

create policy profiles_update on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- business_members
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.business_members enable row level security;

-- Members of the same business can see each other.
create policy business_members_select on public.business_members
for select to authenticated
using (public.is_member_of(business_id));

-- Only employer/c_suite can add new members directly. The signup wizard creates
-- the founding employer row using the service-role key (bypasses RLS), which is
-- the only path that can self-insert.
create policy business_members_insert on public.business_members
for insert to authenticated
with check (public.is_role_at_or_above(business_id, 'c_suite'));

-- Members can update their own non-role fields (position is excluded server-side).
-- Only employer/c_suite can update other members. A user cannot change their own role.
create policy business_members_update_self on public.business_members
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and role = (select bm.role from public.business_members bm where bm.id = business_members.id)
);

create policy business_members_update_admin on public.business_members
for update to authenticated
using (public.is_role_at_or_above(business_id, 'c_suite') and user_id <> auth.uid())
with check (public.is_role_at_or_above(business_id, 'c_suite'));

-- Only employer/c_suite can remove a member.
create policy business_members_delete on public.business_members
for delete to authenticated
using (public.is_role_at_or_above(business_id, 'c_suite'));

comment on policy business_members_update_self on public.business_members is
  'A user can edit their own contact/profile fields but cannot change their own role.';

-- ═══════════════════════════════════════════════════════════════════════════
-- departments
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.departments enable row level security;

create policy departments_select on public.departments
for select to authenticated
using (public.is_member_of(business_id));

create policy departments_insert on public.departments
for insert to authenticated
with check (public.is_role_at_or_above(business_id, 'manager'));

create policy departments_update on public.departments
for update to authenticated
using (public.is_role_at_or_above(business_id, 'manager'))
with check (public.is_role_at_or_above(business_id, 'manager'));

create policy departments_delete on public.departments
for delete to authenticated
using (public.is_role_at_or_above(business_id, 'c_suite'));

-- ═══════════════════════════════════════════════════════════════════════════
-- teams
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.teams enable row level security;

create policy teams_select on public.teams
for select to authenticated
using (public.is_member_of(business_id));

create policy teams_insert on public.teams
for insert to authenticated
with check (public.is_role_at_or_above(business_id, 'manager'));

create policy teams_update on public.teams
for update to authenticated
using (public.is_role_at_or_above(business_id, 'team_lead'))
with check (public.is_role_at_or_above(business_id, 'team_lead'));

create policy teams_delete on public.teams
for delete to authenticated
using (public.is_role_at_or_above(business_id, 'manager'));

-- ═══════════════════════════════════════════════════════════════════════════
-- partners
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.partners enable row level security;

create policy partners_select on public.partners
for select to authenticated
using (public.is_member_of(business_id));

-- Only existing employer-rank members can add partners (founding setup uses service-role).
create policy partners_insert on public.partners
for insert to authenticated
with check (public.is_role_at_or_above(business_id, 'employer'));

create policy partners_update on public.partners
for update to authenticated
using (public.is_role_at_or_above(business_id, 'employer'))
with check (public.is_role_at_or_above(business_id, 'employer'));

create policy partners_delete on public.partners
for delete to authenticated
using (public.is_role_at_or_above(business_id, 'employer'));

-- ═══════════════════════════════════════════════════════════════════════════
-- approval_requests
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.approval_requests enable row level security;

-- Visible to any partner of the business (per spec §3.3).
-- We treat 'partner' as any row in public.partners for this business.
create policy approval_requests_select on public.approval_requests
for select to authenticated
using (
  exists (
    select 1 from public.partners p
    where p.business_id = approval_requests.business_id and p.user_id = auth.uid()
  )
  or requested_by = auth.uid()
);

-- Anyone in the business can request an approval (subject to action-specific server checks).
create policy approval_requests_insert on public.approval_requests
for insert to authenticated
with check (
  public.is_member_of(business_id)
  and requested_by = auth.uid()
);

-- Only partners can decide.
create policy approval_requests_update on public.approval_requests
for update to authenticated
using (
  exists (
    select 1 from public.partners p
    where p.business_id = approval_requests.business_id and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.partners p
    where p.business_id = approval_requests.business_id and p.user_id = auth.uid()
  )
);

comment on policy approval_requests_update on public.approval_requests is
  'Approve/reject restricted to partnership partners (see partners table).';

-- ═══════════════════════════════════════════════════════════════════════════
-- tasks
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.tasks enable row level security;

create policy tasks_select on public.tasks
for select to authenticated
using (public.is_member_of(business_id));

-- Anyone in the business can create a task. Server-side enforces who they can assign to.
create policy tasks_insert on public.tasks
for insert to authenticated
with check (
  public.is_member_of(business_id)
  and created_by = auth.uid()
);

-- Update is allowed for the assignee (status changes), the creator, or team_lead+.
create policy tasks_update on public.tasks
for update to authenticated
using (
  public.is_member_of(business_id)
  and (
    assigned_to = auth.uid()
    or created_by = auth.uid()
    or public.is_role_at_or_above(business_id, 'team_lead')
  )
)
with check (
  public.is_member_of(business_id)
  and (
    assigned_to = auth.uid()
    or created_by = auth.uid()
    or public.is_role_at_or_above(business_id, 'team_lead')
  )
);

create policy tasks_delete on public.tasks
for delete to authenticated
using (
  public.is_role_at_or_above(business_id, 'team_lead')
  or created_by = auth.uid()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- activity_status
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.activity_status enable row level security;

-- Visible to all co-members (so the live tracker works).
create policy activity_status_select on public.activity_status
for select to authenticated
using (
  exists (
    select 1
    from public.business_members me
    join public.business_members target on target.business_id = me.business_id
    where me.user_id = auth.uid()
      and me.status = 'active'
      and target.id = activity_status.business_member_id
  )
);

-- A user can only insert/update their own row.
create policy activity_status_insert on public.activity_status
for insert to authenticated
with check (
  exists (
    select 1 from public.business_members bm
    where bm.id = activity_status.business_member_id and bm.user_id = auth.uid()
  )
);

create policy activity_status_update on public.activity_status
for update to authenticated
using (
  exists (
    select 1 from public.business_members bm
    where bm.id = activity_status.business_member_id and bm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.business_members bm
    where bm.id = activity_status.business_member_id and bm.user_id = auth.uid()
  )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- activity_log
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.activity_log enable row level security;

create policy activity_log_select on public.activity_log
for select to authenticated
using (public.is_member_of(business_id));

-- Inserts/updates happen only via the rollover trigger (which runs as the row owner);
-- no direct client writes.
create policy activity_log_no_write on public.activity_log
for insert to authenticated
with check (false);

-- ═══════════════════════════════════════════════════════════════════════════
-- calendar_events
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.calendar_events enable row level security;

create policy calendar_events_select on public.calendar_events
for select to authenticated
using (public.is_member_of(business_id));

-- Owner can write their own. team_lead+ can write events for anyone in their business.
create policy calendar_events_insert on public.calendar_events
for insert to authenticated
with check (
  public.is_member_of(business_id)
  and (
    owner_id = auth.uid()
    or public.is_role_at_or_above(business_id, 'team_lead')
  )
);

create policy calendar_events_update on public.calendar_events
for update to authenticated
using (
  owner_id = auth.uid()
  or public.is_role_at_or_above(business_id, 'team_lead')
)
with check (
  owner_id = auth.uid()
  or public.is_role_at_or_above(business_id, 'team_lead')
);

create policy calendar_events_delete on public.calendar_events
for delete to authenticated
using (
  owner_id = auth.uid()
  or public.is_role_at_or_above(business_id, 'team_lead')
);

-- ═══════════════════════════════════════════════════════════════════════════
-- invitations
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.invitations enable row level security;

-- Members of the business see invitations the business has issued.
create policy invitations_select on public.invitations
for select to authenticated
using (public.is_member_of(business_id));

-- Issuing invitations: team_lead+ for their team, manager+ for departments, employer/c_suite anywhere.
-- The simple gate at RLS level: team_lead+ in the business. Server-side narrows further.
create policy invitations_insert on public.invitations
for insert to authenticated
with check (
  public.is_role_at_or_above(business_id, 'team_lead')
  and invited_by = auth.uid()
);

create policy invitations_update on public.invitations
for update to authenticated
using (public.is_role_at_or_above(business_id, 'team_lead'))
with check (public.is_role_at_or_above(business_id, 'team_lead'));

create policy invitations_delete on public.invitations
for delete to authenticated
using (public.is_role_at_or_above(business_id, 'manager'));

-- Note: the public invitation-acceptance route at /invite/[token] reads the
-- invitation by token using the service-role client, since the accepting user is
-- (by definition) not yet a member.

-- ═══════════════════════════════════════════════════════════════════════════
-- multi_function_button_config
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.multi_function_button_config enable row level security;

create policy mfb_self on public.multi_function_button_config
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
