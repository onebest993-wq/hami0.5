-- =====================================================
-- Store Catalog Summary View (Fast Home Listing)
-- تاريخ الإنشاء: 31 مارس 2026
-- الإصدار: v1.0
-- =====================================================

CREATE OR REPLACE VIEW store_products_summary AS
SELECT
  id,
  title,
  author,
  brand,
  category,
  price,
  old_price,
  discount,
  image,
  rating,
  reviews,
  badge,
  is_trending,
  is_new
FROM store_products;

-- السماح بالقراءة العامة للـ view
GRANT SELECT ON store_products_summary TO anon, authenticated;

COMMENT ON VIEW store_products_summary IS
'عرض ملخّص سريع لمنتجات المتجر (بدون الحقول الثقيلة) لتحسين تحميل الصفحة الرئيسية.';
