INSERT INTO storage.buckets (id, name, public)
VALUES ('selection-process-files', 'selection-process-files', false)
ON CONFLICT (id) DO NOTHING;

-- Anyone (including unauthenticated users) can upload to this bucket.
-- The bucket is private so files are not publicly readable.
-- The backend validates path format and file existence before accepting an application.
CREATE POLICY "Anyone can upload selection process files"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'selection-process-files');
