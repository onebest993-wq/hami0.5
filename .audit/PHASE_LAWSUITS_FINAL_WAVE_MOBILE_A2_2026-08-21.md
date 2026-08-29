# موجة إكمال أخيرة — موبايل + A2 — 2026-08-21

**قرار المستخدم:** «اترك الأمر لك» بعد الإفصاح عن المتبقي.

## موبايل ([prep](bd4b1ab6-b7a4-448a-9b40-d22fa5ac0973))

- أهداف لمس ≥44px: أرشيف، بطاقة إضبارة، أحوال، مستعجل، أمر ولائي، NewCase إغلاق
- safe-area عبر `hami-overlay-header-safe-pad` على NC_HEADER / Form_Urgent / ActiveOrder header
- بلا إعادة تصميم ألوان/خطوط

## A2 ([mitigation](62fcbed4-1dc0-4fd2-b44a-0577f39ccc72))

- `lawyer_files` / `_active` / `_index`: encrypt-or-fail فوق 512KiB (لا plaintext صامت)
- archived/trash: تحذير DEV + إشارة Sentry إن fallback
- ليس sharding كامل لكل ملف

## المتبقي الاختياري

- sharding archived/trash أو per-file مثل الجنائي
- تقسيم `criminalStageUtils` وملفات مودال ضخمة
- soak إنتاج / بوابة `gate:lawsuits` يدوية إن رغبت

## High المفتوح

**لا.**
