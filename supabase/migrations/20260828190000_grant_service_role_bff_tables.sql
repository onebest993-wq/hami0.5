-- جداول BFF أُنشئت بلا GRANT لـ service_role (نفس عطل audit_logs).
-- PostgREST بعميل الإدارة يرفض SELECT/INSERT رغم أن الجداول حيّة وRLS fail-closed للعميل.

-- قبور التقويم: المسار /api/calendar/tombstones يكتب هذا الجدول ولم يُنشأ على القاعدة الحية.
CREATE TABLE IF NOT EXISTS public.calendar_tombstones (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  event_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_tombstones_user
  ON public.calendar_tombstones (user_id);

ALTER TABLE public.calendar_tombstones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_clients_calendar_tombstones ON public.calendar_tombstones;
CREATE POLICY deny_clients_calendar_tombstones
  ON public.calendar_tombstones
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.calendar_tombstones IS
  'معرّفات أحداث التقويم المحذوفة — BFF + service_role فقط';

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'calendar_tombstones',
    'criminal_case_ownership',
    'execution_files',
    'forum_bans',
    'forum_bookmarks',
    'forum_comment_reports',
    'forum_comment_upvotes',
    'forum_comments',
    'forum_follows',
    'forum_group_members',
    'forum_groups',
    'forum_mutes',
    'forum_post_subscriptions',
    'forum_posts',
    'forum_reports',
    'global_notes',
    'lawsuit_files',
    'lawyer_settings',
    'timeline_events'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', t);
    IF t <> 'lawyer_settings' THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    END IF;
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role',
      t
    );
    EXECUTE format('GRANT ALL ON TABLE public.%I TO postgres', t);
  END LOOP;
END $$;
