-- Align remote forum with the Hami BFF (posts, comments, media).
-- Previous forum_posts used user_key/title/image_url and had 0 rows.

DROP TABLE IF EXISTS public.forum_comment_reports CASCADE;
DROP TABLE IF EXISTS public.forum_comment_upvotes CASCADE;
DROP TABLE IF EXISTS public.forum_bookmarks CASCADE;
DROP TABLE IF EXISTS public.forum_post_subscriptions CASCADE;
DROP TABLE IF EXISTS public.forum_follows CASCADE;
DROP TABLE IF EXISTS public.forum_mutes CASCADE;
DROP TABLE IF EXISTS public.forum_group_members CASCADE;
DROP TABLE IF EXISTS public.forum_groups CASCADE;
DROP TABLE IF EXISTS public.forum_reports CASCADE;
DROP TABLE IF EXISTS public.forum_bans CASCADE;
DROP TABLE IF EXISTS public.forum_comments CASCADE;
DROP TABLE IF EXISTS public.forum_posts CASCADE;

CREATE OR REPLACE FUNCTION public.is_forum_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'role') IN ('SUPER_ADMIN', 'MODERATOR'),
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'MODERATOR'),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_lawyer_forum()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('lawyer', 'moderator', 'admin')
      AND COALESCE(p.is_banned, false) = false
      AND COALESCE(p.is_deleted, false) = false
      AND COALESCE(p.is_active, true) = true
  );
$$;

CREATE TABLE public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  attachment JSONB,
  upvoter_ids UUID[] NOT NULL DEFAULT '{}',
  best_comment_id UUID,
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  group_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forum_posts_created ON public.forum_posts (is_pinned DESC, created_at DESC);
CREATE INDEX idx_forum_posts_author ON public.forum_posts (author_id);
CREATE INDEX idx_forum_posts_public_created ON public.forum_posts (created_at DESC) WHERE group_id IS NULL;

CREATE TABLE public.forum_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forum_comments_post ON public.forum_comments (post_id, created_at);

ALTER TABLE public.forum_posts
  ADD CONSTRAINT forum_posts_best_comment_fk
  FOREIGN KEY (best_comment_id) REFERENCES public.forum_comments(id) ON DELETE SET NULL;

CREATE TABLE public.forum_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'resolved')),
  reviewed_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_forum_reports_pending_unique
  ON public.forum_reports (post_id, reporter_id)
  WHERE status = 'pending';

CREATE TABLE public.forum_bans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  banned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  banned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE public.forum_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_image VARCHAR(1024),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_official BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.forum_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.forum_groups(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, lawyer_id)
);

ALTER TABLE public.forum_posts
  ADD CONSTRAINT forum_posts_group_fk
  FOREIGN KEY (group_id) REFERENCES public.forum_groups(id) ON DELETE SET NULL;

CREATE TABLE public.forum_follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_posts BOOLEAN NOT NULL DEFAULT true,
  notify_comments BOOLEAN NOT NULL DEFAULT true,
  notify_replies BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT forum_follows_no_self CHECK (follower_id <> following_id)
);

CREATE TABLE public.forum_post_subscriptions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE public.forum_bookmarks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE public.forum_comment_upvotes (
  comment_id UUID NOT NULL REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE public.forum_comment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'resolved')),
  reviewed_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.forum_mutes (
  muter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (muter_id, muted_id),
  CONSTRAINT forum_mutes_no_self CHECK (muter_id <> muted_id)
);

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comment_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_mutes ENABLE ROW LEVEL SECURITY;

-- BFF + service_role only (authenticated policies deny direct client access).
CREATE POLICY forum_posts_select ON public.forum_posts FOR SELECT TO authenticated USING (false);
CREATE POLICY forum_posts_insert ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY forum_posts_update ON public.forum_posts FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY forum_posts_delete ON public.forum_posts FOR DELETE TO authenticated USING (false);

CREATE POLICY forum_comments_select ON public.forum_comments FOR SELECT TO authenticated USING (false);
CREATE POLICY forum_comments_insert ON public.forum_comments FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY forum_comments_update ON public.forum_comments FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY forum_comments_delete ON public.forum_comments FOR DELETE TO authenticated USING (false);

CREATE POLICY forum_reports_select ON public.forum_reports FOR SELECT TO authenticated USING (false);
CREATE POLICY forum_reports_insert ON public.forum_reports FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY forum_reports_update ON public.forum_reports FOR UPDATE TO authenticated USING (false);

CREATE POLICY forum_bans_select ON public.forum_bans FOR SELECT TO authenticated USING (false);
CREATE POLICY forum_bans_write ON public.forum_bans FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY forum_follows_select ON public.forum_follows FOR SELECT TO authenticated USING (false);
CREATE POLICY forum_follows_insert ON public.forum_follows FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY forum_follows_update ON public.forum_follows FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY forum_follows_delete ON public.forum_follows FOR DELETE TO authenticated USING (false);

CREATE POLICY forum_post_sub_select ON public.forum_post_subscriptions FOR SELECT TO authenticated USING (false);
CREATE POLICY forum_post_sub_insert ON public.forum_post_subscriptions FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY forum_post_sub_delete ON public.forum_post_subscriptions FOR DELETE TO authenticated USING (false);

CREATE POLICY forum_mutes_select ON public.forum_mutes FOR SELECT TO authenticated USING (false);
CREATE POLICY forum_mutes_insert ON public.forum_mutes FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY forum_mutes_delete ON public.forum_mutes FOR DELETE TO authenticated USING (false);

CREATE OR REPLACE FUNCTION public.forum_posts_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forum_posts_updated ON public.forum_posts;
CREATE TRIGGER trg_forum_posts_updated
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.forum_posts_set_updated_at();

DROP POLICY IF EXISTS "Allow anon upload and read on forum-media" ON storage.objects;
DROP POLICY IF EXISTS forum_media_insert_own ON storage.objects;
DROP POLICY IF EXISTS forum_media_select_own ON storage.objects;
DROP POLICY IF EXISTS forum_media_update_own ON storage.objects;
DROP POLICY IF EXISTS forum_media_delete_own ON storage.objects;

CREATE POLICY forum_media_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'forum-media'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY forum_media_select_own ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'forum-media'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY forum_media_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'forum-media'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'forum-media'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY forum_media_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'forum-media'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
