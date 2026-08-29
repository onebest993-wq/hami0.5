-- =====================================================
-- Admin Headquarters: SECURITY DEFINER RPCs for platform admins
-- Client uses anon/authenticated key; privilege gate = is_platform_admin()
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized Access' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(u.email, '')::text AS email,
    COALESCE(
      NULLIF(trim(both from COALESCE(u.raw_user_meta_data ->> 'fullName', '')), ''),
      NULLIF(trim(both from COALESCE(u.raw_user_meta_data ->> 'familyName', '')), ''),
      split_part(COALESCE(u.email, ''), '@', 1),
      ''
    )::text AS full_name,
    p.role::text,
    CASE
      WHEN COALESCE(p.is_banned, false) = true
        OR COALESCE(p.is_active, true) = false
        OR lower(trim(both from COALESCE(p.status, ''))) IN ('banned', 'suspended', 'frozen')
        THEN 'suspended'
      ELSE 'active'
    END::text AS status,
    p.created_at
  FROM public.profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE COALESCE(p.is_deleted, false) = false
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_banned boolean;
  v_active boolean;
  v_next_banned boolean;
  v_next_active boolean;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized Access' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'targetUserId مطلوب' USING ERRCODE = '22023';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'لا يمكن تجميد الحساب الحالي بهذه العملية' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(p.is_banned, false), COALESCE(p.is_active, true)
  INTO v_banned, v_active
  FROM public.profiles p
  WHERE p.id = p_user_id
    AND COALESCE(p.is_deleted, false) = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'المستخدم غير موجود' USING ERRCODE = 'P0002';
  END IF;

  IF v_banned = true OR v_active = false THEN
    v_next_banned := false;
    v_next_active := true;
  ELSE
    v_next_banned := true;
    v_next_active := false;
  END IF;

  UPDATE public.profiles p
  SET
    is_banned = v_next_banned,
    is_active = v_next_active,
    status = CASE WHEN v_next_banned THEN 'suspended' ELSE 'active' END,
    updated_at = now()
  WHERE p.id = p_user_id;

  RETURN QUERY
  SELECT
    r.id,
    r.email,
    r.full_name,
    r.role,
    r.status,
    r.created_at
  FROM public.admin_list_users() r
  WHERE r.id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_toggle_user_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_status(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_change_user_role(p_user_id uuid, p_role text)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized Access' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'targetUserId مطلوب' USING ERRCODE = '22023';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'لا يمكن تغيير دور الحساب الحالي بهذه العملية' USING ERRCODE = '22023';
  END IF;

  v_role := lower(trim(both from COALESCE(p_role, '')));
  IF v_role NOT IN ('lawyer', 'client', 'admin', 'moderator') THEN
    RAISE EXCEPTION 'دور غير مسموح' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND COALESCE(p.is_deleted, false) = false
  ) THEN
    RAISE EXCEPTION 'المستخدم غير موجود' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.profiles p
  SET
    role = v_role,
    updated_at = now()
  WHERE p.id = p_user_id;

  RETURN QUERY
  SELECT
    r.id,
    r.email,
    r.full_name,
    r.role,
    r.status,
    r.created_at
  FROM public.admin_list_users() r
  WHERE r.id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_change_user_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_change_user_role(uuid, text) TO authenticated;
