-- ============================================================
-- Migration 3 of 3: Supabase Storage bucket for deliverables
-- public.users exists at this point (created in migration 1).
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deliverables',
  'deliverables',
  false,        -- private bucket, never directly publicly accessible
  52428800,     -- 50 MB per file
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Admins can upload, update, and delete files
CREATE POLICY "admins_manage_deliverable_files"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'deliverables'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'deliverables'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- Note: all file reads go through the getSignedUrl server action, which uses
-- the service role key (bypasses RLS) after first confirming DB-level access.
