create table public.task_comments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  author_id    uuid not null references auth.users(id) on delete cascade,
  body         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments (task_id, created_at);

create table public.task_attachments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  uploader_id  uuid not null references auth.users(id) on delete cascade,
  file_name    text not null,
  file_url     text not null,
  file_size    bigint,
  created_at   timestamptz not null default now()
);

-- RLS
alter table public.task_comments enable row level security;
create policy task_comments_select on public.task_comments
  for select to authenticated using (public.is_member_of(workspace_id));
create policy task_comments_insert on public.task_comments
  for insert to authenticated
  with check (public.is_member_of(workspace_id) and author_id = auth.uid());
create policy task_comments_delete on public.task_comments
  for delete to authenticated
  using (author_id = auth.uid() or public.is_role_at_or_above(workspace_id, 'manager'));

alter table public.task_attachments enable row level security;
create policy task_attachments_select on public.task_attachments
  for select to authenticated using (public.is_member_of(workspace_id));
create policy task_attachments_insert on public.task_attachments
  for insert to authenticated
  with check (public.is_member_of(workspace_id) and uploader_id = auth.uid());
create policy task_attachments_delete on public.task_attachments
  for delete to authenticated
  using (uploader_id = auth.uid() or public.is_role_at_or_above(workspace_id, 'manager'));

alter publication supabase_realtime add table public.task_comments;
notify pgrst, 'reload schema';
