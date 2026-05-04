-- Adds FKs from user-id columns to public.profiles(id) so PostgREST can embed
-- profile data via select(...profiles(...)). The existing FKs to auth.users(id)
-- stay in place; multiple FKs on the same column to different tables are valid.
--
-- Safe because the on_auth_user_created trigger ensures a profile exists for
-- every auth user before any business_members / tasks / approval_requests row
-- can reference them.

alter table public.business_members
  add constraint business_members_user_id_profiles_fkey
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

-- PostgREST caches the schema; force a reload so the new FKs become queryable.
notify pgrst, 'reload schema';
