# إغلاق — E2E ملف زائر المنتدى

**التاريخ:** 2026-08-29  
**النطاق:** `e2e/lawyer-profile-z-forum-visitor.spec.ts` + مسار فتح المنتدى من الرئيسية

## ما أُنجز

1. **تسليح PreDock stub:** تسجيل `window.__hamiE2eForceOpenCommunity` (+ `__hamiE2eForceOpenCommunityStub`) في `createPreDockFeatureStubs`.
2. **cleanup الخطاف الحي:** عند إلغاء تركيب `useLawyerDashboardCommunity` يُعاد تسليح الـ stub بدل حذف الخطاف (كان يسبب تذبذب الاختبار الثاني).
3. **جلسة المنتدى بعد الإقلاع:** `__hamiE2eApplyDevMockAuth` في `AuthContext` + استدعاؤه من `hydrateForumE2ESession`.
4. **حماية مسار BFF+shell:** عدم فرض ضيف ثابت عند وجود محامٍ غير ضيف في التخزين.
5. **إقلاع الملف:** انتظار `home-dock-forum` مع `home-dock-forum-profile`.
6. **بناء E2E:** تثبيت `VITE_BFF_AUTH=true` في `e2e-build-env.mjs`.

## إثبات

- `npm run build:e2e` ناجح.
- `lawyer-profile-z-forum-visitor.spec.ts` — **2 passed × 3** متتالية على preview :8097.
- `authBoot.test.ts` — 11 passed.

## التقييم (صادق)

| بُعد | درجة | ملاحظة |
|------|------|--------|
| أداء/استقرار | 8.5/10 | E2E الزائر أخضر ×3؛ ليس إثبات جهاز حقيقي |
| نظافة | 8/10 | خطاف E2E محدود بـ `VITE_E2E` |
| أمان | 8/10 | لا توسيع صلاحيات إنتاج |
| جودة كود | 8/10 | فصل stub / hydrate / auth re-apply |
| موبايل | 6/10 | Capacitor/يدوي خارج هذا الإغلاق |
| صدق | — | لم يُثبَت OTP HQ حي ولا زائر على جهاز |

## الموقع

جاهز للانتقال من مسار E2E الزائر: **نعم** (حدود الاختبار الآلي أعلاه).
