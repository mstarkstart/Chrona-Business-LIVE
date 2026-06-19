-- Chrona V1 — full schema (fresh-install end state)
-- Keep in sync with migrations 0001–0005. Workspaces + project-mgmt roles + projects.
-- Role hierarchy (rank): owner 5 > admin 4 > manager 3 > member 2 > guest 1.

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

drop function if exists public.current_workspace_id() cascade;
drop function if exists public.current_business_id() cascade;
drop function if exists public.current_user_role(uuid) cascade;
drop function if exists public.is_role_at_or_above(uuid, text) cascade;
drop function if exists public.set_active_workspace(uuid) cascade;
drop function if exists public.set_active_business(uuid) cascade;
drop function if exists public.is_member_of(uuid) cascade;

-- ───────────────────────────────────────────────────────────────────────────
-- Tables
-- ───────────────────────────────────────────────────────────────────────────

create table public.workspaces (
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
  ui_mode         text not null default 'simple' check (ui_mode in ('simple','advanced')),
  created_at      timestamptz not null default now()
);

create table public.departments (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  description  text,
  created_at   timestamptz not null default now()
);

create table public.teams (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  department_id  uuid references public.departments(id) on delete set null,
  name           text not null,
  description    text,
  created_at     timestamptz not null default now()
);

create table public.workspace_members (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  role                text not null check (role in ('owner','admin','manager','member','guest')),
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
  unique (workspace_id, user_id)
);

create table public.partners (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  share_percentage  numeric(5,2),
  created_at        timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.approval_requests (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  requested_by  uuid not null references auth.users(id) on delete cascade,
  action_type   text not null,
  payload       jsonb not null,
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected','expired')),
  decided_by    uuid references auth.users(id),
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);

create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  description  text,
  status       text not null default 'active' check (status in ('active','archived','completed')),
  template     text check (template in ('software','agency','ops','blank')),
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
create index projects_workspace_idx on public.projects (workspace_id);

create table public.project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner','admin','manager','member','guest')),
  added_at    timestamptz not null default now(),
  unique (project_id, user_id)
);

create table public.tasks (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid not null references public.workspaces(id) on delete cascade,
  project_id               uuid references public.projects(id) on delete set null,
  parent_task_id           uuid references public.tasks(id) on delete cascade,
  title                    text not null,
  description              text,
  priority                 text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status                   text not null default 'pending'
                             check (status in ('pending','in_progress','completed','cancelled','awaiting_approval','awaiting_acceptance')),
  assigned_to              uuid references auth.users(id) on delete set null,
  assigned_team_id         uuid references public.teams(id) on delete set null,
  assigned_department_id   uuid references public.departments(id) on delete set null,
  created_by               uuid not null references auth.users(id) on delete cascade,
  position                 double precision not null default 0,
  labels                   text[] not null default '{}',
  watchers                 uuid[] not null default '{}',
  estimated_hours          numeric,
  due_date                 timestamptz,
  start_at                 timestamptz,
  end_at                   timestamptz,
  completed_at             timestamptz,
  requires_approval        boolean not null default false,
  approved_by              uuid references auth.users(id),
  created_at               timestamptz not null default now()
);
create index tasks_workspace_assignee_status_idx on public.tasks (workspace_id, assigned_to, status);
create index tasks_workspace_due_idx             on public.tasks (workspace_id, due_date);
create index tasks_project_idx                   on public.tasks (project_id);

create table public.activity_status (
  workspace_member_id uuid primary key references public.workspace_members(id) on delete cascade,
  status              text not null default 'available'
                        check (status in ('available','tasking','meeting','lunch_break','personal_time','training','offline')),
  updated_at          timestamptz not null default now()
);

create table public.activity_log (
  id                  uuid primary key default gen_random_uuid(),
  workspace_member_id uuid not null references public.workspace_members(id) on delete cascade,
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  status              text not null,
  started_at          timestamptz not null default now(),
  ended_at            timestamptz
);
create index activity_log_member_idx on public.activity_log (workspace_member_id, started_at desc);

create table public.calendar_events (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
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
create index calendar_events_workspace_owner_start_idx on public.calendar_events (workspace_id, owner_id, start_at);

create table public.invitations (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  email             text not null,
  role              text not null check (role in ('owner','admin','manager','member','guest')),
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
create index invitations_workspace_idx on public.invitations (workspace_id);
create index invitations_email_idx     on public.invitations (lower(email));

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null check (type in (
    'task_assignment','task_accepted','task_declined',
    'task_approved','task_rejected','approval_request'
  )),
  title        text not null,
  body         text,
  task_id      uuid references public.tasks(id) on delete cascade,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index notifications_user_idx      on public.notifications (user_id, created_at desc);
create index notifications_workspace_idx on public.notifications (workspace_id, created_at desc);

create table public.multi_function_button_config (
  user_id      uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actions      jsonb not null default '[]'::jsonb,
  primary key (user_id, workspace_id)
);

-- ───────────────────────────────────────────────────────────────────────────
-- Helper functions (security definer)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.set_active_workspace(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_workspace_id is null then
    perform set_config('app.current_workspace_id', '', true);
    return;
  end if;
  if not exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and status = 'active'
  ) then
    raise exception 'not a member of workspace %', p_workspace_id using errcode = '42501';
  end if;
  perform set_config('app.current_workspace_id', p_workspace_id::text, true);
end;
$$;

create or replace function public.current_workspace_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text;
begin
  v := current_setting('app.current_workspace_id', true);
  if v is null or v = '' then
    return null;
  end if;
  return v::uuid;
exception when others then
  return null;
end;
$$;

create or replace function public.current_user_role(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.workspace_members
  where workspace_id = p_workspace_id
    and user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.is_role_at_or_above(p_workspace_id uuid, p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with rank as (
    select case p_role
      when 'owner'   then 5
      when 'admin'   then 4
      when 'manager' then 3
      when 'member'  then 2
      when 'guest'   then 1
      else 0 end as min_rank
  ),
  me as (
    select case role
      when 'owner'   then 5
      when 'admin'   then 4
      when 'manager' then 3
      when 'member'  then 2
      when 'guest'   then 1
      else 0 end as my_rank
    from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid() and status = 'active'
    limit 1
  )
  select coalesce((select my_rank from me) >= (select min_rank from rank), false);
$$;

create or replace function public.is_member_of(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid() and status = 'active'
  );
$$;

grant execute on function public.set_active_workspace(uuid)        to authenticated;
grant execute on function public.current_workspace_id()            to authenticated;
grant execute on function public.current_user_role(uuid)           to authenticated;
grant execute on function public.is_role_at_or_above(uuid, text)   to authenticated;
grant execute on function public.is_member_of(uuid)                to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- Activity-log roll-over trigger
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.activity_status_rollover()
returns trigger
language plpgsql
as $$
declare
  v_workspace_id uuid;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  select workspace_id into v_workspace_id
  from public.workspace_members where id = new.workspace_member_id;

  update public.activity_log
  set ended_at = now()
  where workspace_member_id = new.workspace_member_id and ended_at is null;

  insert into public.activity_log (workspace_member_id, workspace_id, status, started_at)
  values (new.workspace_member_id, v_workspace_id, new.status, now());

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
-- Realtime publication wiring
-- ───────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.activity_status;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.approval_requests;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.projects;

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════════════

-- workspaces ----------------------------------------------------------------
alter table public.workspaces enable row level security;
create policy workspaces_select on public.workspaces
for select to authenticated using (public.is_member_of(id));
create policy workspaces_insert on public.workspaces
for insert to authenticated with check (auth.uid() = created_by);
create policy workspaces_update on public.workspaces
for update to authenticated
using (public.is_role_at_or_above(id, 'owner'))
with check (public.is_role_at_or_above(id, 'owner'));

-- profiles ------------------------------------------------------------------
alter table public.profiles enable row level security;
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.workspace_members me
    join public.workspace_members other on other.workspace_id = me.workspace_id
    where me.user_id = auth.uid() and me.status = 'active' and other.user_id = profiles.id
  )
);
create policy profiles_insert on public.profiles
for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- workspace_members ---------------------------------------------------------
alter table public.workspace_members enable row level security;
create policy workspace_members_select on public.workspace_members
for select to authenticated using (public.is_member_of(workspace_id));
create policy workspace_members_insert on public.workspace_members
for insert to authenticated with check (public.is_role_at_or_above(workspace_id, 'admin'));
create policy workspace_members_update_self on public.workspace_members
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and role = (select wm.role from public.workspace_members wm where wm.id = workspace_members.id)
);
create policy workspace_members_update_admin on public.workspace_members
for update to authenticated
using (public.is_role_at_or_above(workspace_id, 'admin') and user_id <> auth.uid())
with check (public.is_role_at_or_above(workspace_id, 'admin'));
create policy workspace_members_delete on public.workspace_members
for delete to authenticated using (public.is_role_at_or_above(workspace_id, 'admin'));

-- departments ---------------------------------------------------------------
alter table public.departments enable row level security;
create policy departments_select on public.departments
for select to authenticated using (public.is_member_of(workspace_id));
create policy departments_insert on public.departments
for insert to authenticated with check (public.is_role_at_or_above(workspace_id, 'manager'));
create policy departments_update on public.departments
for update to authenticated
using (public.is_role_at_or_above(workspace_id, 'manager'))
with check (public.is_role_at_or_above(workspace_id, 'manager'));
create policy departments_delete on public.departments
for delete to authenticated using (public.is_role_at_or_above(workspace_id, 'admin'));

-- teams ---------------------------------------------------------------------
alter table public.teams enable row level security;
create policy teams_select on public.teams
for select to authenticated using (public.is_member_of(workspace_id));
create policy teams_insert on public.teams
for insert to authenticated with check (public.is_role_at_or_above(workspace_id, 'manager'));
create policy teams_update on public.teams
for update to authenticated
using (public.is_role_at_or_above(workspace_id, 'manager'))
with check (public.is_role_at_or_above(workspace_id, 'manager'));
create policy teams_delete on public.teams
for delete to authenticated using (public.is_role_at_or_above(workspace_id, 'manager'));

-- partners ------------------------------------------------------------------
alter table public.partners enable row level security;
create policy partners_select on public.partners
for select to authenticated using (public.is_member_of(workspace_id));
create policy partners_insert on public.partners
for insert to authenticated with check (public.is_role_at_or_above(workspace_id, 'owner'));
create policy partners_update on public.partners
for update to authenticated
using (public.is_role_at_or_above(workspace_id, 'owner'))
with check (public.is_role_at_or_above(workspace_id, 'owner'));
create policy partners_delete on public.partners
for delete to authenticated using (public.is_role_at_or_above(workspace_id, 'owner'));

-- approval_requests ---------------------------------------------------------
alter table public.approval_requests enable row level security;
create policy approval_requests_select on public.approval_requests
for select to authenticated
using (
  exists (select 1 from public.partners p
          where p.workspace_id = approval_requests.workspace_id and p.user_id = auth.uid())
  or requested_by = auth.uid()
);
create policy approval_requests_insert on public.approval_requests
for insert to authenticated
with check (public.is_member_of(workspace_id) and requested_by = auth.uid());
create policy approval_requests_update on public.approval_requests
for update to authenticated
using (exists (select 1 from public.partners p
               where p.workspace_id = approval_requests.workspace_id and p.user_id = auth.uid()))
with check (exists (select 1 from public.partners p
                    where p.workspace_id = approval_requests.workspace_id and p.user_id = auth.uid()));

-- tasks ---------------------------------------------------------------------
alter table public.tasks enable row level security;
create policy tasks_select on public.tasks
for select to authenticated using (public.is_member_of(workspace_id));
create policy tasks_insert on public.tasks
for insert to authenticated
with check (
  public.is_member_of(workspace_id)
  and created_by = auth.uid()
  and public.is_role_at_or_above(workspace_id, 'member')
);
create policy tasks_update on public.tasks
for update to authenticated
using (
  public.is_member_of(workspace_id)
  and (
    (assigned_to = auth.uid() and public.is_role_at_or_above(workspace_id, 'member'))
    or created_by = auth.uid()
    or public.is_role_at_or_above(workspace_id, 'manager')
  )
)
with check (
  public.is_member_of(workspace_id)
  and (
    (assigned_to = auth.uid() and public.is_role_at_or_above(workspace_id, 'member'))
    or created_by = auth.uid()
    or public.is_role_at_or_above(workspace_id, 'manager')
  )
);
create policy tasks_delete on public.tasks
for delete to authenticated
using (public.is_role_at_or_above(workspace_id, 'manager') or created_by = auth.uid());

-- activity_status -----------------------------------------------------------
alter table public.activity_status enable row level security;
create policy activity_status_select on public.activity_status
for select to authenticated
using (
  exists (
    select 1 from public.workspace_members me
    join public.workspace_members target on target.workspace_id = me.workspace_id
    where me.user_id = auth.uid() and me.status = 'active'
      and target.id = activity_status.workspace_member_id
  )
);
create policy activity_status_insert on public.activity_status
for insert to authenticated
with check (exists (select 1 from public.workspace_members wm
                    where wm.id = activity_status.workspace_member_id and wm.user_id = auth.uid()));
create policy activity_status_update on public.activity_status
for update to authenticated
using (exists (select 1 from public.workspace_members wm
               where wm.id = activity_status.workspace_member_id and wm.user_id = auth.uid()))
with check (exists (select 1 from public.workspace_members wm
                    where wm.id = activity_status.workspace_member_id and wm.user_id = auth.uid()));

-- activity_log --------------------------------------------------------------
alter table public.activity_log enable row level security;
create policy activity_log_select on public.activity_log
for select to authenticated using (public.is_member_of(workspace_id));
create policy activity_log_no_write on public.activity_log
for insert to authenticated with check (false);

-- calendar_events -----------------------------------------------------------
alter table public.calendar_events enable row level security;
create policy calendar_events_select on public.calendar_events
for select to authenticated using (public.is_member_of(workspace_id));
create policy calendar_events_insert on public.calendar_events
for insert to authenticated
with check (
  public.is_member_of(workspace_id)
  and (
    (owner_id = auth.uid() and public.is_role_at_or_above(workspace_id, 'member'))
    or public.is_role_at_or_above(workspace_id, 'manager')
  )
);
create policy calendar_events_update on public.calendar_events
for update to authenticated
using (owner_id = auth.uid() or public.is_role_at_or_above(workspace_id, 'manager'))
with check (owner_id = auth.uid() or public.is_role_at_or_above(workspace_id, 'manager'));
create policy calendar_events_delete on public.calendar_events
for delete to authenticated
using (owner_id = auth.uid() or public.is_role_at_or_above(workspace_id, 'manager'));

-- invitations ---------------------------------------------------------------
alter table public.invitations enable row level security;
create policy invitations_select on public.invitations
for select to authenticated using (public.is_member_of(workspace_id));
create policy invitations_insert on public.invitations
for insert to authenticated
with check (public.is_role_at_or_above(workspace_id, 'manager') and invited_by = auth.uid());
create policy invitations_update on public.invitations
for update to authenticated
using (public.is_role_at_or_above(workspace_id, 'manager'))
with check (public.is_role_at_or_above(workspace_id, 'manager'));
create policy invitations_delete on public.invitations
for delete to authenticated using (public.is_role_at_or_above(workspace_id, 'manager'));

-- notifications -------------------------------------------------------------
alter table public.notifications enable row level security;
create policy notifications_select on public.notifications
for select to authenticated using (user_id = auth.uid());
create policy notifications_insert on public.notifications
for insert to authenticated with check (false); -- service-role only
create policy notifications_update on public.notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- multi_function_button_config ----------------------------------------------
alter table public.multi_function_button_config enable row level security;
create policy mfb_self on public.multi_function_button_config
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- projects ------------------------------------------------------------------
alter table public.projects enable row level security;
create policy projects_select on public.projects
for select to authenticated using (public.is_member_of(workspace_id));
create policy projects_insert on public.projects
for insert to authenticated with check (public.is_role_at_or_above(workspace_id, 'manager'));
create policy projects_update on public.projects
for update to authenticated
using (public.is_role_at_or_above(workspace_id, 'manager'))
with check (public.is_role_at_or_above(workspace_id, 'manager'));
create policy projects_delete on public.projects
for delete to authenticated using (public.is_role_at_or_above(workspace_id, 'manager'));

-- project_members -----------------------------------------------------------
alter table public.project_members enable row level security;
create policy project_members_select on public.project_members
for select to authenticated
using (exists (select 1 from public.projects pr
               where pr.id = project_members.project_id and public.is_member_of(pr.workspace_id)));
create policy project_members_insert on public.project_members
for insert to authenticated
with check (exists (select 1 from public.projects pr
                    where pr.id = project_members.project_id
                      and public.is_role_at_or_above(pr.workspace_id, 'manager')));
create policy project_members_delete on public.project_members
for delete to authenticated
using (exists (select 1 from public.projects pr
               where pr.id = project_members.project_id
                 and public.is_role_at_or_above(pr.workspace_id, 'manager')));

-- ───────────────────────────────────────────────────────────────────────────
-- Profile FKs for PostgREST embedding (mirrors migration 0003)
-- ───────────────────────────────────────────────────────────────────────────
alter table public.workspace_members
  add constraint workspace_members_user_id_profiles_fkey
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

-- Time tracking & avatar setup
ALTER TABLE public.activity_status ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.activity_status_rollover()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  IF tg_op = 'UPDATE' AND new.status IS NOT DISTINCT FROM old.status AND new.task_id IS NOT DISTINCT FROM old.task_id THEN
    RETURN new;
  END IF;

  SELECT workspace_id INTO v_workspace_id
  FROM public.workspace_members WHERE id = new.workspace_member_id;

  UPDATE public.activity_log
  SET ended_at = now()
  WHERE workspace_member_id = new.workspace_member_id AND ended_at IS NULL;

  INSERT INTO public.activity_log (workspace_member_id, workspace_id, status, started_at, task_id)
  VALUES (new.workspace_member_id, v_workspace_id, new.status, now(), new.task_id);

  new.updated_at := now();
  RETURN new;
END;
$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public read of avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads of avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to delete avatars" ON storage.objects;

CREATE POLICY "Allow public read of avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Allow authenticated uploads of avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Allow owners to update avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Allow owners to delete avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');

notify pgrst, 'reload schema';
