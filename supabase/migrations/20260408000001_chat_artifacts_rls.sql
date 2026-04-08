-- Add RLS policies for chat-artifacts storage bucket
-- Admins can upload, update, and delete chat artifact files
DROP POLICY IF EXISTS "admins_manage_chat_artifacts" ON storage.objects;
CREATE POLICY "admins_manage_chat_artifacts"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'chat-artifacts'
    AND public.get_my_role() = 'admin'
  )
  WITH CHECK (
    bucket_id = 'chat-artifacts'
    AND public.get_my_role() = 'admin'
  );

-- Authenticated users can view/download chat artifacts (signed URLs still required)
DROP POLICY IF EXISTS "authenticated_view_chat_artifacts" ON storage.objects;
CREATE POLICY "authenticated_view_chat_artifacts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-artifacts');
