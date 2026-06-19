-- =====================================================
-- منتدى المحامين — مجموعات نقاشية تخصصية
-- =====================================================

CREATE TABLE IF NOT EXISTS public.forum_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_image VARCHAR(1024),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_official BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_groups_created ON public.forum_groups (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_groups_name ON public.forum_groups (name);

CREATE TABLE IF NOT EXISTS public.forum_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.forum_groups(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, lawyer_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_group_members_lawyer ON public.forum_group_members (lawyer_id);
CREATE INDEX IF NOT EXISTS idx_forum_group_members_group ON public.forum_group_members (group_id);

ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.forum_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_forum_posts_group_created
  ON public.forum_posts (group_id, created_at DESC)
  WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_forum_posts_public_created
  ON public.forum_posts (created_at DESC)
  WHERE group_id IS NULL;

ALTER TABLE public.forum_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_group_members ENABLE ROW LEVEL SECURITY;

-- المجموعات: قراءة لكل محامٍ مسجّل، إنشاء للمسجّلين
DROP POLICY IF EXISTS forum_groups_select ON public.forum_groups;
CREATE POLICY forum_groups_select ON public.forum_groups
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS forum_groups_insert ON public.forum_groups;
CREATE POLICY forum_groups_insert ON public.forum_groups
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- الأعضاء: قراءة للجميع، انضمام/مغادرة للمستخدم نفسه
DROP POLICY IF EXISTS forum_group_members_select ON public.forum_group_members;
CREATE POLICY forum_group_members_select ON public.forum_group_members
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS forum_group_members_insert ON public.forum_group_members;
CREATE POLICY forum_group_members_insert ON public.forum_group_members
  FOR INSERT TO authenticated
  WITH CHECK (lawyer_id = auth.uid());

DROP POLICY IF EXISTS forum_group_members_delete ON public.forum_group_members;
CREATE POLICY forum_group_members_delete ON public.forum_group_members
  FOR DELETE TO authenticated
  USING (lawyer_id = auth.uid() OR public.is_forum_admin());
