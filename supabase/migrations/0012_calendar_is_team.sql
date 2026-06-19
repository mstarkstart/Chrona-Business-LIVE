-- Add is_team to calendar_events
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS is_team boolean not null default false;

-- Drop existing insert policy and recreate to allow team events insertion properly if needed
-- Wait, the existing policy is:
-- create policy calendar_events_insert on public.calendar_events
--   for insert to authenticated
--   with check (
--     public.is_member_of(workspace_id)
--     and (
--       (owner_id = auth.uid() and public.is_role_at_or_above(workspace_id, 'member'))
--       or public.is_role_at_or_above(workspace_id, 'manager')
--     )
--   );
-- The policy doesn't restrict is_team, so we just need the column!

-- Also, drop and recreate calendar_events_select to make sure team members can see it?
-- Currently it's: for select to authenticated using (public.is_member_of(workspace_id));
-- So everyone can see it already!

-- This column is all we need.
