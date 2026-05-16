-- =====================================================
-- Store Catalog (Libraries & Supplies) - Supabase Schema
-- تاريخ الإنشاء: 31 مارس 2026
-- الإصدار: v1.0
-- =====================================================

-- جدول منتجات المتجر (المكتبة واللوازم)
CREATE TABLE IF NOT EXISTS store_products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  brand TEXT,
  category TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  old_price NUMERIC(12, 2),
  discount INTEGER,
  image TEXT NOT NULL,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
  reviews INTEGER NOT NULL DEFAULT 0,
  badge TEXT,
  is_trending BOOLEAN NOT NULL DEFAULT FALSE,
  is_new BOOLEAN NOT NULL DEFAULT FALSE,

  -- التفاصيل
  kind TEXT NOT NULL DEFAULT 'general' CHECK (kind IN ('robe', 'book', 'general')),
  stock INTEGER NOT NULL DEFAULT 0,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT NOT NULL DEFAULT '',
  shipping JSONB NOT NULL DEFAULT '{"title":"الشحن والتوصيل","content":"توصيل سريع خلال 24-48 ساعة."}'::jsonb,
  return_policy JSONB NOT NULL DEFAULT '{"title":"سياسة الاسترجاع","content":"يمكن الاسترجاع وفق الشروط المعتمدة."}'::jsonb,
  sizes JSONB,
  fabrics JSONB,
  embroidery JSONB,
  year TEXT,
  pages INTEGER,
  cover TEXT,
  preview_available BOOLEAN,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_products_category ON store_products(category);
CREATE INDEX IF NOT EXISTS idx_store_products_trending ON store_products(is_trending);
CREATE INDEX IF NOT EXISTS idx_store_products_new ON store_products(is_new);
CREATE INDEX IF NOT EXISTS idx_store_products_kind ON store_products(kind);

-- تفعيل RLS
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

-- السماح بالقراءة للجميع (الواجهة تحتاج كتالوج عام)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'store_products'
      AND policyname = 'Public read store products'
  ) THEN
    CREATE POLICY "Public read store products"
      ON store_products
      FOR SELECT
      USING (TRUE);
  END IF;
END $$;

-- منع الكتابة من العميل (إدارة المنتجات فقط من SQL/Admin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'store_products'
      AND policyname = 'No client write store products'
  ) THEN
    CREATE POLICY "No client write store products"
      ON store_products
      FOR ALL
      USING (FALSE)
      WITH CHECK (FALSE);
  END IF;
END $$;

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_store_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_store_products_updated_at ON store_products;
CREATE TRIGGER trg_store_products_updated_at
  BEFORE UPDATE ON store_products
  FOR EACH ROW
  EXECUTE FUNCTION update_store_products_updated_at();

-- بيانات أولية مطابقة للكتالوج المحلي الحالي
INSERT INTO store_products (
  id, title, author, brand, category, price, old_price, discount, image, rating, reviews, badge, is_trending, is_new,
  kind, stock, images, description, shipping, return_policy, sizes, fabrics, embroidery, year, pages, cover, preview_available
)
VALUES
(
  '1',
  'شرح قانون التنفيذ العراقي',
  'القاضي فلان الفلاني',
  NULL,
  'books',
  25000, 30000, 15,
  'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400',
  4.8, 124, 'الأكثر مبيعاً', TRUE, FALSE,
  'book', 45,
  '[{"id":"1","url":"https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800","alt":"غلاف الكتاب"},{"id":"2","url":"https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=800","alt":"صفحات الكتاب"}]'::jsonb,
  'شرح شامل ومفصل لقانون التنفيذ العراقي رقم 45 لسنة 1980 مع آخر التعديلات.',
  '{"title":"الشحن والتوصيل","content":"توصيل سريع خلال 24-48 ساعة."}'::jsonb,
  '{"title":"سياسة الاسترجاع","content":"يمكن استرجاع الكتاب خلال 7 أيام بشرط عدم فتح الغلاف البلاستيكي."}'::jsonb,
  NULL, NULL, NULL,
  '2026', 450, 'فني مقوى', TRUE
),
(
  '2',
  'روب المحاماة الفاخر - طراز 2026',
  NULL,
  'Legal Prestige',
  'robes',
  180000, 220000, 18,
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  4.9, 89, 'حصري', FALSE, TRUE,
  'robe', 15,
  '[{"id":"1","url":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800","alt":"منظر أمامي"},{"id":"2","url":"https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=800","alt":"منظر خلفي"},{"id":"3","url":"https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800","alt":"تفاصيل الخيط الذهبي"}]'::jsonb,
  'روب محاماة فاخر مصنوع من قماش صيفي مريح مع تطريز ذهبي راقٍ.',
  '{"title":"الشحن والتوصيل","content":"توصيل لكافة المحاكم خلال 48 ساعة. شحن مجاني للطلبات فوق 100,000 د.ع."}'::jsonb,
  '{"title":"سياسة الاسترجاع","content":"يمكن استرجاع المنتج خلال 14 يوم من تاريخ الاستلام بشرط عدم الاستخدام."}'::jsonb,
  '[{"id":"S","label":"S","price":0},{"id":"M","label":"M","price":0},{"id":"L","label":"L","price":0},{"id":"XL","label":"XL","price":0},{"id":"custom","label":"تفصيل خاص","price":15000}]'::jsonb,
  '[{"id":"summer","label":"صيفي خفيف","price":0},{"id":"winter","label":"شتوي ثقيل","price":10000}]'::jsonb,
  '{"available":true,"price":5000,"placeholder":"اكتب اسمك ليتم تطريزه على الروب..."}'::jsonb,
  NULL, NULL, NULL, NULL
),
(
  '3',
  'قلم مونت بلانك - إصدار خاص',
  NULL,
  'Montblanc',
  'stationery',
  95000, NULL, NULL,
  'https://images.unsplash.com/photo-1565022788534-1e59001d6dff?w=400',
  5.0, 56, NULL, TRUE, FALSE,
  'general', 20,
  '[{"id":"1","url":"https://images.unsplash.com/photo-1565022788534-1e59001d6dff?w=800","alt":"القلم"}]'::jsonb,
  'قلم فاخر مخصص للاستخدام المهني اليومي للمحامين.',
  '{"title":"الشحن والتوصيل","content":"توصيل سريع خلال 24-48 ساعة."}'::jsonb,
  '{"title":"سياسة الاسترجاع","content":"يمكن استرجاع المنتج خلال 7 أيام بشرط سلامة التغليف."}'::jsonb,
  NULL, NULL, NULL,
  NULL, NULL, NULL, NULL
),
(
  '4',
  'حقيبة جلدية إيطالية',
  NULL,
  'Ferragamo',
  'briefcases',
  350000, 450000, 22,
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
  4.7, 43, 'عرض حصري', FALSE, FALSE,
  'general', 8,
  '[{"id":"1","url":"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800","alt":"الحقيبة"}]'::jsonb,
  'حقيبة جلدية فاخرة لحفظ المستندات والملفات القانونية.',
  '{"title":"الشحن والتوصيل","content":"توصيل لكافة المحافظات خلال 48-72 ساعة."}'::jsonb,
  '{"title":"سياسة الاسترجاع","content":"يمكن الاسترجاع خلال 14 يوماً بشرط عدم الاستخدام."}'::jsonb,
  NULL, NULL, NULL,
  NULL, NULL, NULL, NULL
),
(
  '5',
  'القانون المدني العراقي - 3 مجلدات',
  'د. عبد الرزاق السنهوري',
  NULL,
  'books',
  75000, 90000, 17,
  'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400',
  4.9, 234, NULL, TRUE, FALSE,
  'book', 30,
  '[{"id":"1","url":"https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=800","alt":"المجلدات"}]'::jsonb,
  'مجموعة مرجعية شاملة للقانون المدني العراقي.',
  '{"title":"الشحن والتوصيل","content":"توصيل سريع خلال 24-48 ساعة."}'::jsonb,
  '{"title":"سياسة الاسترجاع","content":"يمكن استرجاع الكتاب خلال 7 أيام بشرط عدم فتح الغلاف."}'::jsonb,
  NULL, NULL, NULL,
  '2026', 1200, 'مجلدات مقواة', TRUE
),
(
  '6',
  'تابلت سامسونج S9 - للمحامين',
  NULL,
  'Samsung',
  'tech',
  650000, NULL, NULL,
  'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400',
  4.6, 78, NULL, FALSE, TRUE,
  'general', 12,
  '[{"id":"1","url":"https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800","alt":"التابلت"}]'::jsonb,
  'جهاز لوحي عالي الأداء لإدارة المذكرات والملفات داخل المحكمة.',
  '{"title":"الشحن والتوصيل","content":"توصيل خلال 24-48 ساعة داخل بغداد."}'::jsonb,
  '{"title":"سياسة الاسترجاع","content":"يمكن الاسترجاع خلال 7 أيام مع بقاء الجهاز بحالته الأصلية."}'::jsonb,
  NULL, NULL, NULL,
  NULL, NULL, NULL, NULL
)
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  old_price = EXCLUDED.old_price,
  discount = EXCLUDED.discount,
  image = EXCLUDED.image,
  rating = EXCLUDED.rating,
  reviews = EXCLUDED.reviews,
  badge = EXCLUDED.badge,
  is_trending = EXCLUDED.is_trending,
  is_new = EXCLUDED.is_new,
  kind = EXCLUDED.kind,
  stock = EXCLUDED.stock,
  images = EXCLUDED.images,
  description = EXCLUDED.description,
  shipping = EXCLUDED.shipping,
  return_policy = EXCLUDED.return_policy,
  sizes = EXCLUDED.sizes,
  fabrics = EXCLUDED.fabrics,
  embroidery = EXCLUDED.embroidery,
  year = EXCLUDED.year,
  pages = EXCLUDED.pages,
  cover = EXCLUDED.cover,
  preview_available = EXCLUDED.preview_available,
  updated_at = NOW();

COMMENT ON TABLE store_products IS 'كتالوج متجر المكتبة واللوازم - يدعم العرض العام مع تفاصيل المنتج الكاملة.';
