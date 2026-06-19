-- Storage defence-in-depth: authenticated users only touch objects under {auth.uid()}/...
-- BFF upload/remove uses service_role; these policies block direct client bypass.

INSERT INTO storage.buckets (id, name, public)
VALUES ('make-f09713ba', 'make-f09713ba', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "make_f09713ba_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "make_f09713ba_select_own" ON storage.objects;
DROP POLICY IF EXISTS "make_f09713ba_delete_own" ON storage.objects;

CREATE POLICY "make_f09713ba_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'make-f09713ba'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "make_f09713ba_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'make-f09713ba'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "make_f09713ba_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'make-f09713ba'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
