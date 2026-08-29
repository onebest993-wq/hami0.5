# متابعة المتبقي الاختياري — Wave6+ / E2E / critical-path / CaseShare جنائي

**تاريخ:** 2026-08-21  
**لا commit.**

---

## 1) Wave 6+ تقسيم (~450–500)

| ملف | قبل → بعد |
|-----|-----------|
| `useExecutionDashboardDebtorSummonsCoerciveHandlers` | 480 → **126** |
| `ExecutionSmartCard` | 485 → **210** |
| `useCriminalDashboardNavigationGuard` | 484 → **314** |
| `investigationDefendantScopeUtils` | 492 → **40** barrel |
| `appealObjectionModals` | 501 → **7** barrel |

**SKIP متعمّد:** orchestration · DossierBody · JudgmentOutcomeActions  
اختبارات التقسيم: **61** خضراء.

---

## 2) E2E سحابة حية + soak جهاز

| نشاط | نتيجة |
|------|--------|
| `npm run soak:lawsuits-device` | طُبع checklist (يحتاج جهاز + `DEVICE_SOAK_URL`) |
| `E2E_LAWSUIT_CLOUD_LIVE` | **غير مفعّل** — live cloud لم يُشغَّل |
| `build:e2e` | نجح |
| `test:e2e:lawsuits:ci` | **3 passed / 7 failed** — بوابة دخول على dist قديم ثم `ERR_CONNECTION_REFUSED` لـ preview :8090 |

**صدق:** التحقق الآلي الكامل E2E غير مُغلق كأخضر؛ يحتاج إعادة تشغيل preview مستقرة + (للسحابة) `E2E_LAWSUIT_CLOUD_LIVE=1`. قائمة soak جاهزة يدوياً.

---

## 3) critical-path gzip → هدف 120

| قبل | بعد |
|-----|-----|
| ~**249 KB** / 27 ملف | ~**77 KB** / 9 ملفات |

- أُخرج من المسار الحرج: home-paint · vendor-supabase · vendor-misc · boot-peek · forum-profile  
- أرضية متبقية: vendor-react (~45) + boot-runtime (~25)  
- `check-bundle-size`: **OK** (critical تحت 120 هدف)

---

## 4) ملكية CaseShare الجزائية على السيرفر

لا جدول سحابي سابق → **Option B**:

- migration: `supabase/migrations/20260821225600_criminal_case_ownership.sql`
- API: `POST /api/case-share/criminal-ownership` (register/unregister)
- `verifyCriminalRowOnServer` + السماح بـ create على السيرفر بعد إثبات الملكية
- العميل: register قبل create · unregister عند الحذف

**قبل الإنتاج:** طبّق الـ migration على Supabase.  
اختبارات caseShare: **64** خضراء · مع boot honesty: **87** خضراء.

---

## تقييم الدفعة

| بند | مغلق؟ |
|-----|--------|
| تقسيم ≥450 جديد | **نعم** (عدا المتعمّد) |
| critical-path ≤120 | **نعم** (~77) |
| CaseShare جنائي سيرفر | **نعم كوداً** — ينتظر apply migration |
| E2E live + soak جهاز | **جزئي** — أدوات جاهزة؛ تشغيل أخضر كامل معلّق على بيئة |

---

## ما يبقى لك يدوياً

1. `supabase db push` / تطبيق `20260821225600_criminal_case_ownership.sql`
2. `DEVICE_SOAK_URL=http://… npm run soak:lawsuits-device` على جهاز
3. `E2E_LAWSUIT_CLOUD_LIVE=1 npm run test:e2e:civil-lawsuits:cloud:live` عند جاهزية staging
4. إعادة `npm run test:e2e:lawsuits:ci` بعد preview مستقر
