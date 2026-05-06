-- Add awaiting_acceptance to task status and create notifications table

-- 1. Extend task status check constraint
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check
  check (status in (
    'pending','in_progress','completed','cancelled',
    'awaiting_approval','awaiting_acceptance'
  ));

-- 2. Notifications table
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in (
    'task_assignment','task_accepted','task_declined',
    'task_approved','task_rejected','approval_request'
  )),
  title       text not null,
  body        text,
  task_id     uuid references public.tasks(id) on delete cascade,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_business_idx on public.notifications (business_id, created_at desc);

-- 3. RLS
alter table public.notifications enable row level security;

-- Users see only their own notifications
create policy notifications_select on public.notifications
for select to authenticated
using (user_id = auth.uid());

-- System inserts via service-role; users cannot self-insert
create policy notifications_insert on public.notifications
for insert to authenticated
with check (false); -- service-role only

-- Users can mark their own read
create policy notifications_update on public.notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 4. Realtime
alter publication supabase_realtime add table public.notifications;

notify pgrst, 'reload schema';
