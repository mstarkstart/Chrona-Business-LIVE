-- ── Rewards ──────────────────────────────────────────────────────────────────
create table public.member_points (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  points          int not null default 0,
  tasks_completed int not null default 0,
  streak_days     int not null default 0,
  last_activity   date,
  updated_at      timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.point_events (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  event_type   text not null check (event_type in ('task_completed','streak_bonus','manual_award','task_early','first_task')),
  points       int not null,
  description  text,
  task_id      uuid references public.tasks(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index point_events_workspace_idx on public.point_events (workspace_id, created_at desc);

-- ── Team Chat ─────────────────────────────────────────────────────────────────
create table public.chat_messages (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  body         text not null check (length(body) <= 2000),
  created_at   timestamptz not null default now()
);
create index chat_messages_workspace_idx on public.chat_messages (workspace_id, created_at desc);

-- RLS
alter table public.member_points enable row level security;
create policy member_points_select on public.member_points
  for select to authenticated using (public.is_member_of(workspace_id));
create policy member_points_insert on public.member_points
  for insert to authenticated with check (public.is_member_of(workspace_id));
create policy member_points_update on public.member_points
  for update to authenticated using (public.is_member_of(workspace_id));

alter table public.point_events enable row level security;
create policy point_events_select on public.point_events
  for select to authenticated using (public.is_member_of(workspace_id));

alter table public.chat_messages enable row level security;
create policy chat_select on public.chat_messages
  for select to authenticated using (public.is_member_of(workspace_id));
create policy chat_insert on public.chat_messages
  for insert to authenticated
  with check (public.is_member_of(workspace_id) and user_id = auth.uid());
create policy chat_delete on public.chat_messages
  for delete to authenticated
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.member_points;

notify pgrst, 'reload schema';
