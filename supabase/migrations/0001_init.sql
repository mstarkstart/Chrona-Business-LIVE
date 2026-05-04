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
