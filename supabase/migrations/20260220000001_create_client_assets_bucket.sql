INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-assets',
  'client-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "admins_manage_client_assets" ON storage.objects;
CREATE POLICY "admins_manage_client_assets"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'client-assets'
    AND public.get_my_role() = 'admin'
  )
  WITH CHECK (
    bucket_id = 'client-assets'
    AND public.get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS "authenticated_view_client_assets" ON storage.objects;
CREATE POLICY "authenticated_view_client_assets"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'client-assets');
