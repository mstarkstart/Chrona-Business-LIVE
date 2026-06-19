-- Chrona V1 — workspaces rename + role remap + projects layer
-- ────────────────────────────────────────────────────────────────────────────
-- This migration is DATA-PRESERVING. It renames the `businesses` family to the
-- `workspaces` family, remaps the employment role model to the project-mgmt role
-- model (owner/admin/manager/member/guest), and introduces a Projects layer.
--
-- Role merge map (applied to data, CHECKs, RLS thresholds, helper ranks):
--   employer  -> owner    (5)
--   c_suite   -> admin     (4)
--   manager   -> manager   (3)
--   team_lead -> manager   (3)   ← MERGED: former team_leads gain manager rights (intended)
--   employee  -> member    (2)
--   (new)        guest     (1)   ← view + comment only
--
-- V1 access boundary = WORKSPACE membership. project_members exists as metadata
-- for UI + future per-project scoping but is NOT yet an RLS boundary.
-- Keep this file in sync with supabase/setup.sql (the fresh-install end state).
-- ════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 0. Drop every existing RLS policy (they reference role strings / helper fns
--    we are about to change). Recreated at the end against the new schema.
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists businesses_select on public.businesses;
drop policy if exists businesses_insert on public.businesses;
drop policy if exists businesses_update on public.businesses;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;

drop policy if exists business_members_select on public.business_members;
drop policy if exists business_members_insert on public.business_members;
drop policy if exists business_members_update_self on public.business_members;
drop policy if exists business_members_update_admin on public.business_members;
drop policy if exists business_members_delete on public.business_members;

drop policy if exists departments_select on public.departments;
drop policy if exists departments_insert on public.departments;
drop policy if exists departments_update on public.departments;
drop policy if exists departments_delete on public.departments;

drop policy if exists teams_select on public.teams;
drop policy if exists teams_insert on public.teams;
drop policy if exists teams_update on public.teams;
drop policy if exists teams_delete on public.teams;

drop policy if exists partners_select on public.partners;
drop policy if exists partners_insert on public.partners;
drop policy if exists partners_update on public.partners;
drop policy if exists partners_delete on public.partners;

drop policy if exists approval_requests_select on public.approval_requests;
drop policy if exists approval_requests_insert on public.approval_requests;
drop policy if exists approval_requests_update on public.approval_requests;

drop policy if exists tasks_select on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;

drop policy if exists activity_status_select on public.activity_status;
drop policy if exists activity_status_insert on public.activity_status;
drop policy if exists activity_status_update on public.activity_status;

drop policy if exists activity_log_select on public.activity_log;
drop policy if exists activity_log_no_write on public.activity_log;

drop policy if exists calendar_events_select on public.calendar_events;
drop policy if exists calendar_events_insert on public.calendar_events;
drop policy if exists calendar_events_update on public.calendar_events;
drop policy if exists calendar_events_delete on public.calendar_events;

drop policy if exists invitations_select on public.invitations;
drop policy if exists invitations_insert on public.invitations;
drop policy if exists invitations_update on public.invitations;
drop policy if exists invitations_delete on public.invitations;

drop policy if exists mfb_self on public.multi_function_button_config;

drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_insert on public.notifications;
drop policy if exists notifications_update on public.notifications;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Role backfill — while the old CHECK still permits old values.
-- ───────────────────────────────────────────────────────────────────────────
alter table public.business_members drop constraint if exists business_members_role_check;
alter table public.invitations      drop constraint if exists invitations_role_check;

update public.business_members set role = case role
  when 'employer'  then 'owner'
  when 'c_suite'   then 'admin'
  when 'team_lead' then 'manager'   -- merge
  when 'employee'  then 'member'
  else role end;                     -- 'manager' maps to itself

update public.invitations set role = case role
  when 'employer'  then 'owner'
  when 'c_suite'   then 'admin'
  when 'team_lead' then 'manager'
  when 'employee'  then 'member'
  else role end;

alter table public.business_members
  add constraint business_members_role_check
  check (role in ('owner','admin','manager','member','guest'));
alter table public.invitations
  add constraint invitations_role_check
  check (role in ('owner','admin','manager','member','guest'));

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Rename tables and columns (data-preserving). Unique constraints survive.
-- ───────────────────────────────────────────────────────────────────────────
alter table public.businesses        rename to workspaces;
alter table public.business_members  rename to workspace_members;

alter table public.departments                  rename column business_id to workspace_id;
alter table public.teams                         rename column business_id to workspace_id;
alter table public.workspace_members             rename column business_id to workspace_id;
alter table public.partners                      rename column business_id to workspace_id;
alter table public.approval_requests             rename column business_id to workspace_id;
alter table public.tasks                         rename column business_id to workspace_id;
alter table public.calendar_events               rename column business_id to workspace_id;
alter table public.invitations                   rename column business_id to workspace_id;
alter table public.multi_function_button_config  rename column business_id to workspace_id;
alter table public.notifications                 rename column business_id to workspace_id;
alter table public.activity_log                  rename column business_id to workspace_id;

alter table public.activity_status rename column business_member_id to workspace_member_id;
alter table public.activity_log    rename column business_member_id to workspace_member_id;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Helper functions — drop old-named, recreate against renamed tables + new
--    GUC `app.current_workspace_id` + new role ranks.
-- ───────────────────────────────────────────────────────────────────────────
drop function if exists public.set_active_business(uuid) cascade;
drop function if exists public.current_business_id() cascade;
drop function if exists public.current_user_role(uuid) cascade;
drop function if exists public.is_role_at_or_above(uuid, text) cascade;
drop function if exists public.is_member_of(uuid) cascade;

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
-- 4. Recreate the activity-log roll-over trigger fn against renamed tables.
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

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Projects layer (additive).
-- ───────────────────────────────────────────────────────────────────────────
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

-- Per-user Simple/Advanced UI mode (progressive complexity).
alter table public.profiles add column if not exists ui_mode text not null default 'simple'
  check (ui_mode in ('simple','advanced'));

-- Task project linkage + depth columns (nullable / defaulted — no backfill needed).
alter table public.tasks add column if not exists project_id      uuid references public.projects(id) on delete set null;
alter table public.tasks add column if not exists parent_task_id  uuid references public.tasks(id) on delete cascade;
alter table public.tasks add column if not exists position        double precision not null default 0;
alter table public.tasks add column if not exists labels          text[] not null default '{}';
alter table public.tasks add column if not exists watchers        uuid[] not null default '{}';
alter table public.tasks add column if not exists estimated_hours numeric;
create index if not exists tasks_project_idx on public.tasks (project_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Recreate ALL RLS policies against the new schema, names, roles, helpers.
-- ───────────────────────────────────────────────────────────────────────────

-- workspaces ----------------------------------------------------------------
create policy workspaces_select on public.workspaces
for select to authenticated using (public.is_member_of(id));

create policy workspaces_insert on public.workspaces
for insert to authenticated with check (auth.uid() = created_by);

create policy workspaces_update on public.workspaces
for update to authenticated
using (public.is_role_at_or_above(id, 'owner'))
with check (public.is_role_at_or_above(id, 'owner'));

-- profiles ------------------------------------------------------------------
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
create policy tasks_select on public.tasks
for select to authenticated using (public.is_member_of(workspace_id));

-- Guests cannot create tasks: self-create requires member+.
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
create policy activity_log_select on public.activity_log
for select to authenticated using (public.is_member_of(workspace_id));
create policy activity_log_no_write on public.activity_log
for insert to authenticated with check (false);

-- calendar_events -----------------------------------------------------------
create policy calendar_events_select on public.calendar_events
for select to authenticated using (public.is_member_of(workspace_id));
-- Guests cannot create events (even their own): member+ required.
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

-- multi_function_button_config ----------------------------------------------
create policy mfb_self on public.multi_function_button_config
for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications -------------------------------------------------------------
create policy notifications_select on public.notifications
for select to authenticated using (user_id = auth.uid());
create policy notifications_insert on public.notifications
for insert to authenticated with check (false); -- service-role only
create policy notifications_update on public.notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

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

-- project_members (workspace-scoped via parent project) ---------------------
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
-- 7. Realtime + schema reload.
-- ───────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.projects;

notify pgrst, 'reload schema';
