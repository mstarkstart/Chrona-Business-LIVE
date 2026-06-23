-- Create 'avatars' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Replace broad storage write policies with scoped ones.
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read of avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads of avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can upload scoped avatars" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can update scoped avatars" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can delete scoped avatars" ON storage.objects;

CREATE POLICY "public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "authenticated can upload scoped avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] ~ '^workspace_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      AND public.is_role_at_or_above(replace((storage.foldername(name))[1], 'workspace_', '')::uuid, 'owner')
    )
  ));

CREATE POLICY "authenticated can update scoped avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] ~ '^workspace_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      AND public.is_role_at_or_above(replace((storage.foldername(name))[1], 'workspace_', '')::uuid, 'owner')
    )
  ))
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] ~ '^workspace_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      AND public.is_role_at_or_above(replace((storage.foldername(name))[1], 'workspace_', '')::uuid, 'owner')
    )
  ));

CREATE POLICY "authenticated can delete scoped avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] ~ '^workspace_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      AND public.is_role_at_or_above(replace((storage.foldername(name))[1], 'workspace_', '')::uuid, 'owner')
    )
  ));