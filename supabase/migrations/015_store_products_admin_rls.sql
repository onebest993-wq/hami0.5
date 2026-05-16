-- =====================================================
-- Store Catalog Admin RLS Policies
-- تاريخ الإنشاء: 31 مارس 2026
-- الإصدار: v1.0
-- =====================================================

-- إزالة سياسة المنع الشامل السابقة
DROP POLICY IF EXISTS "No client write store products" ON store_products;

-- السماح للمدير فقط بإضافة المنتجات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'store_products'
      AND policyname = 'Admin insert store products'
  ) THEN
    CREATE POLICY "Admin insert store products"
      ON store_products
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');
  END IF;
END $$;

-- السماح للمدير فقط بتحديث المنتجات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'store_products'
      AND policyname = 'Admin update store products'
  ) THEN
    CREATE POLICY "Admin update store products"
      ON store_products
      FOR UPDATE
      TO authenticated
      USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
      WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');
  END IF;
END $$;

-- السماح للمدير فقط بحذف المنتجات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'store_products'
      AND policyname = 'Admin delete store products'
  ) THEN
    CREATE POLICY "Admin delete store products"
      ON store_products
      FOR DELETE
      TO authenticated
      USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');
  END IF;
END $$;
