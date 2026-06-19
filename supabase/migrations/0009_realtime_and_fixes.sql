-- =========================================================
-- 0009: Realtime + Phase-2 Bug Fixes
-- =========================================================

-- 1. REPLICA IDENTITY FULL on activity_status
--    Without this, Supabase Realtime UPDATE events don't include
--    the new row values — clients never receive status changes.
ALTER TABLE activity_status REPLICA IDENTITY FULL;

-- 2. Ensure activity_status is in the Realtime publication.
--    Idempotent — safe to run even if already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'activity_status'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE activity_status;
  END IF;
END $$;

-- 3. Chat RLS — allow all active workspace members to read and send.
--    Drop existing policies first (idempotent).
DROP POLICY IF EXISTS "workspace members can read chat" ON chat_messages;
DROP POLICY IF EXISTS "workspace members can send chat" ON chat_messages;

CREATE POLICY "workspace members can read chat"
  ON chat_messages FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "workspace members can send chat"
  ON chat_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Ensure chat_messages is in the Realtime publication.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;

-- 4. Notifications — ensure all workspace members can read their own.
DROP POLICY IF EXISTS "users can read own notifications" ON notifications;
CREATE POLICY "users can read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "service role can insert notifications" ON notifications;
-- Service role bypass is default; no explicit policy needed for insert via supabaseAdmin.

-- 5. Avatar storage policies (run only if avatars bucket exists).
--    Paste these in Supabase Dashboard > SQL Editor if bucket is missing.
--    The bucket itself must be created manually in Storage UI.

-- Allow authenticated users to upload their own avatar.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    -- Upload own avatar
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'objects' AND policyname = 'users can upload own avatar'
    ) THEN
      EXECUTE $pol$
        CREATE POLICY "users can upload own avatar"
          ON storage.objects FOR INSERT
          TO authenticated
          WITH CHECK (
            bucket_id = 'avatars'
            AND auth.uid()::text = (storage.foldername(name))[1]
          )
      $pol$;
    END IF;

    -- Update own avatar
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'objects' AND policyname = 'users can update own avatar'
    ) THEN
      EXECUTE $pol$
        CREATE POLICY "users can update own avatar"
          ON storage.objects FOR UPDATE
          TO authenticated
          USING (
            bucket_id = 'avatars'
            AND auth.uid()::text = (storage.foldername(name))[1]
          )
      $pol$;
    END IF;

    -- Public read of avatars
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'objects' AND policyname = 'public can view avatars'
    ) THEN
      EXECUTE $pol$
        CREATE POLICY "public can view avatars"
          ON storage.objects FOR SELECT
          TO public
          USING (bucket_id = 'avatars')
      $pol$;
    END IF;
  END IF;
END $$;
