-- ============================================================
-- 0015: Project privacy + calendar description
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Calendar event description column
alter table public.calendar_events add column if not exists description text;

-- 2. Project deadline column (in case 0014 wasn't run)
alter table public.projects add column if not exists deadline date;

-- 3. Helper: is current user a member of this specific project?
create or replace function public.is_project_member(p_project_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.project_members pm
    join public.projects pr on pr.id = pm.project_id
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and public.is_member_of(pr.workspace_id)
  );
$$;

-- 4. Projects: managers+ see all; members/guests see only their projects
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
for select to authenticated
using (
  public.is_member_of(workspace_id)
  and (
    public.is_role_at_or_above(workspace_id, 'manager')
    or public.is_project_member(id)
  )
);

-- 5. Tasks: workspace tasks always visible; project tasks only to project members
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
for select to authenticated
using (
  public.is_member_of(workspace_id)
  and (
    project_id is null
    or public.is_role_at_or_above(workspace_id, 'manager')
    or public.is_project_member(project_id)
  )
);
