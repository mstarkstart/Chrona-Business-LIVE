-- 1. Alter activity tables to reference tasks
ALTER TABLE public.activity_status ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

-- 2. Update the activity status rollover trigger function to handle task_id
CREATE OR REPLACE FUNCTION public.activity_status_rollover()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  -- If status and task_id are unchanged, do nothing
  IF tg_op = 'UPDATE' AND new.status IS NOT DISTINCT FROM old.status AND new.task_id IS NOT DISTINCT FROM old.task_id THEN
    RETURN new;
  END IF;

  SELECT workspace_id INTO v_workspace_id
  FROM public.workspace_members WHERE id = new.workspace_member_id;

  -- Close previous activity interval
  UPDATE public.activity_log
  SET ended_at = now()
  WHERE workspace_member_id = new.workspace_member_id AND ended_at IS NULL;

  -- Open new activity interval
  INSERT INTO public.activity_log (workspace_member_id, workspace_id, status, started_at, task_id)
  VALUES (new.workspace_member_id, v_workspace_id, new.status, now(), new.task_id);

  new.updated_at := now();
  RETURN new;
END;
$$;

-- 3. Add avatar_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 4. Set up Supabase storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Add Storage Policies for Avatars
-- Drop existing policies if they exist to prevent conflicts
DROP POLICY IF EXISTS "Allow public read of avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads of avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to delete avatars" ON storage.objects;

-- Create new policies
CREATE POLICY "Allow public read of avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated uploads of avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow owners to update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Allow owners to delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- 6. Update notifications type constraint to support task_completion
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'task_assignment', 'task_accepted', 'task_declined', 'task_approved', 'task_rejected', 'approval_request', 'task_completion'
));
