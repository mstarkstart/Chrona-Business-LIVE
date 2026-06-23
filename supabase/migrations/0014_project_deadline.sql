-- Add deadline to projects and activate project_members usage
alter table public.projects add column if not exists deadline date;
