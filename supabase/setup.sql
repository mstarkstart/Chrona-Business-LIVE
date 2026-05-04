-- Chrona Business — initial schema
-- Drops obsolete scaffolding, then creates the v1 schema described in newprompt.md §3.

create extension if not exists pgcrypto;

-- ───────────────────────────────────────────────────────────────────────────
-- Drop obsolete tables from earlier scaffolds (idempotent)
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename not in ('schema_migrations')
  loop
    execute format('drop table if exists public.%I cascade', t);
  end loop;
end$$;

drop function if exists public.current_business_id() cascade;
drop function if exists public.current_user_role(uuid) cascade;
drop function if exists public.is_role_at_or_above(uuid, text) cascade;
drop function if exists public.set_active_business(uuid) cascade;

-- ───────────────────────────────────────────────────────────────────────────
-- Tables
-- ───────────────────────────────────────────────────────────────────────────

create table public.businesses (
  id                              uuid primary key default gen_random_uuid(),
  name                            text not null,
  founding_date                   date,
  business_type                   text not null check (business_type in ('self_employed','partnership','corporation')),
  industry                        text,
  services                        text,
  employee_count_estimate         int,
  team_count_estimate             int,
  partnership_requires_approval   boolean not null default true,
  created_by                      uuid references auth.users(id),
  created_at                      timestamptz not null default now()
);

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  first_name      text,
  last_name       text,
  preferred_name  text,
  date_of_birth   date,
  gender          text,
  pronouns        text,
  personal_email  text,
  personal_phone  text,
  created_at      timestamptz not null default now()
);

create table public.departments (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null,
  description  text,
  created_at   timestamptz not null default now()
);

create table public.teams (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  department_id  uuid references public.departments(id) on delete set null,
  name           text not null,
  description    text,
  created_at     timestamptz not null default now()
);

create table public.business_members (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  role                text not null check (role in ('employer','c_suite','manager','team_lead','employee')),
  position            text,
  department_id       uuid references public.departments(id) on delete set null,
  team_id             uuid references public.teams(id) on delete set null,
  date_joined         date,
  company_email       text,
  work_phone          text,
  is_owner            boolean not null default false,
  contract_type       text not null default 'full_time'
                        check (contract_type in ('full_time','contract_3m','contract_6m','contract_12m','custom')),
  contract_end_date   date,
  status              text not null default 'active'
                        check (status in ('invited','active','suspended','removed')),
  created_at          timestamptz not null default now(),
  unique (business_id, user_id)
);

create table public.partners (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  share_percentage  numeric(5,2),
  created_at        timestamptz not null default now(),
  unique (business_id, user_id)
);

create table public.approval_requests (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  requested_by  uuid not null references auth.users(id) on delete cascade,
  action_type   text not null,
  payload       jsonb not null,
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected','expired')),
  decided_by    uuid references auth.users(id),
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);

create table public.tasks (
  id                       uuid primary key default gen_random_uuid(),
  business_id              uuid not null references public.businesses(id) on delete cascade,
  title                    text not null,
  description              text,
  priority                 text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status                   text not null default 'pending'
                             check (status in ('pending','in_progress','completed','cancelled','awaiting_approval')),
  assigned_to              uuid references auth.users(id) on delete set null,
  assigned_team_id         uuid references public.teams(id) on delete set null,
  assigned_department_id   uuid references public.departments(id) on delete set null,
  created_by               uuid not null references auth.users(id) on delete cascade,
  due_date                 timestamptz,
  start_at                 timestamptz,
  end_at                   timestamptz,
  completed_at             timestamptz,
  requires_approval        boolean not null default false,
  approved_by              uuid references auth.users(id),
  created_at               timestamptz not null default now()
);
create index tasks_business_assignee_status_idx on public.tasks (business_id, assigned_to, status);
create index tasks_business_due_idx               on public.tasks (business_id, due_date);

create table public.activity_status (
  business_member_id  uuid primary key references public.business_members(id) on delete cascade,
  status              text not null default 'available'
                        check (status in ('available','tasking','meeting','lunch_break','personal_time','training','offline')),
  updated_at          timestamptz not null default now()
);

create table public.activity_log (
  id                  uuid primary key default gen_random_uuid(),
  business_member_id  uuid not null references public.business_members(id) on delete cascade,
  business_id         uuid not null references public.businesses(id) on delete cascade,
  status              text not null,
  started_at          timestamptz not null default now(),
  ended_at            timestamptz
);
create index activity_log_member_idx on public.activity_log (business_member_id, started_at desc);

create table public.calendar_events (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses(id) on delete cascade,
  owner_id           uuid not null references auth.users(id) on delete cascade,
  title              text not null,
  event_type         text not null default 'meeting'
                       check (event_type in ('meeting','task_block','break','lunch','training','focus','other')),
  start_at           timestamptz not null,
  end_at             timestamptz not null,
  task_id            uuid references public.tasks(id) on delete set null,
  external_provider  text check (external_provider in ('google','outlook')),
  external_id        text,
  created_at         timestamptz not null default now(),
  check (end_at > start_at)
);
create index calendar_events_business_owner_start_idx on public.calendar_events (business_id, owner_id, start_at);

-- (calendar_integrations table intentionally omitted: v1 uses in-app calendar only.)

create table public.invitations (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  email             text not null,
  role              text not null check (role in ('employer','c_suite','manager','team_lead','employee')),
  department_id     uuid references public.departments(id) on delete set null,
  team_id           uuid references public.teams(id) on delete set null,
  position          text,
  contract_type     text not null default 'full_time'
                      check (contract_type in ('full_time','contract_3m','contract_6m','contract_12m','custom')),
  contract_end_date date,
  token             text not null unique,
  invited_by        uuid not null references auth.users(id) on delete cascade,
  accepted_at       timestamptz,
  expires_at        timestamptz not null default (now() + interval '14 days'),
  created_at        timestamptz not null default now()
);
create index invitations_business_idx on public.invitations (business_id);
create index invitations_email_idx    on public.invitations (lower(email));

create table public.multi_function_button_config (
  user_id      uuid not null references auth.users(id) on delete cascade,
  business_id  uuid not null references public.businesses(id) on delete cascade,
  actions      jsonb not null default '[]'::jsonb,
  primary key (user_id, business_id)
);

-- ───────────────────────────────────────────────────────────────────────────
-- Helper functions (security definer)
-- ───────────────────────────────────────────────────────────────────────────

-- Active-business selection is stored as a session GUC ('app.current_business_id').
-- A server action sets it via set_active_business(uuid) at the start of each request
-- after verifying the user belongs to that business.
create or replace function public.set_active_business(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_business_id is null then
    perform set_config('app.current_business_id', '', true);
    return;
  end if;
  if not exists (
    select 1 from public.business_members
    where business_id = p_business_id
      and user_id = auth.uid()
      and status = 'active'
  ) then
    raise exception 'not a member of business %', p_business_id using errcode = '42501';
  end if;
  perform set_config('app.current_business_id', p_business_id::text, true);
end;
$$;

create or replace function public.current_business_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text;
begin
  v := current_setting('app.current_business_id', true);
  if v is null or v = '' then
    return null;
  end if;
  return v::uuid;
exception when others then
  return null;
end;
$$;

create or replace function public.current_user_role(p_business_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.business_members
  where business_id = p_business_id
    and user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.is_role_at_or_above(p_business_id uuid, p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with rank as (
    select case p_role
      when 'employer'  then 5
      when 'c_suite'   then 4
      when 'manager'   then 3
      when 'team_lead' then 2
      when 'employee'  then 1
      else 0 end as min_rank
  ),
  me as (
    select case role
      when 'employer'  then 5
      when 'c_suite'   then 4
      when 'manager'   then 3
      when 'team_lead' then 2
      when 'employee'  then 1
      else 0 end as my_rank
    from public.business_members
    where business_id = p_business_id and user_id = auth.uid() and status = 'active'
    limit 1
  )
  select coalesce((select my_rank from me) >= (select min_rank from rank), false);
$$;

-- Returns true if auth.uid() is a member of p_business_id (any active role).
create or replace function public.is_member_of(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_members
    where business_id = p_business_id and user_id = auth.uid() and status = 'active'
  );
$$;

grant execute on function public.set_active_business(uuid)        to authenticated;
grant execute on function public.current_business_id()             to authenticated;
grant execute on function public.current_user_role(uuid)           to authenticated;
grant execute on function public.is_role_at_or_above(uuid, text)   to authenticated;
grant execute on function public.is_member_of(uuid)                to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- Activity-log roll-over trigger: closing the previous open span when status flips.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.activity_status_rollover()
returns trigger
language plpgsql
as $$
declare
  v_business_id uuid;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  select business_id into v_business_id from public.business_members where id = new.business_member_id;

  update public.activity_log
  set ended_at = now()
  where business_member_id = new.business_member_id and ended_at is null;

  insert into public.activity_log (business_member_id, business_id, status, started_at)
  values (new.business_member_id, v_business_id, new.status, now());

  new.updated_at := now();
  return new;
end;
$$;

create trigger activity_status_rollover_trg
before insert or update on public.activity_status
for each row execute function public.activity_status_rollover();

-- ───────────────────────────────────────────────────────────────────────────
-- Auto-create a profiles row when a new auth user is provisioned.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, personal_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ───────────────────────────────────────────────────────────────────────────
-- Realtime publication wiring for the tables that drive live UI.
-- ───────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.activity_status;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.approval_requests;
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
-- Adds FKs from user-id columns to public.profiles(id) so PostgREST can embed
-- profile data via select(...profiles(...)). The existing FKs to auth.users(id)
-- stay in place; multiple FKs on the same column to different tables are valid.
--
-- Safe because the on_auth_user_created trigger ensures a profile exists for
-- every auth user before any business_members / tasks / approval_requests row
-- can reference them.

alter table public.business_members
  add constraint business_members_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.tasks
  add constraint tasks_assigned_to_profiles_fkey
  foreign key (assigned_to) references public.profiles(id) on delete set null;

alter table public.tasks
  add constraint tasks_created_by_profiles_fkey
  foreign key (created_by) references public.profiles(id) on delete cascade;

alter table public.approval_requests
  add constraint approval_requests_requested_by_profiles_fkey
  foreign key (requested_by) references public.profiles(id) on delete cascade;

alter table public.partners
  add constraint partners_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.calendar_events
  add constraint calendar_events_owner_id_profiles_fkey
  foreign key (owner_id) references public.profiles(id) on delete cascade;

-- PostgREST caches the schema; force a reload so the new FKs become queryable.
notify pgrst, 'reload schema';
