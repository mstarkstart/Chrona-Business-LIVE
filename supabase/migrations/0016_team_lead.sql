-- ============================================================
-- 0016: Add Team Lead column to teams table
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

-- Add lead_member_id to public.teams pointing to public.workspace_members
alter table public.teams add column if not exists lead_member_id uuid references public.workspace_members(id) on delete set null;

-- Add RLS policy update if needed, or let standard team write policies handle it
notify pgrst, 'reload schema';
