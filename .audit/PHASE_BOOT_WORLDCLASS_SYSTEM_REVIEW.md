# إغلاق — مراجعة منظومة الإقلاع كاملة (كود حي)

تاريخ: 2026-08-13

## الجرد (من الكود لا من تقارير قديمة)

المسار الفعلي:

1. `index.html` + `hami-boot.js` → بحر `#0a0f1c` (`#hami-static-boot`)
2. `src/index.tsx` → stem اللوحة + `kickoffBootCriticalPreload` + preamble
3. `mountApplication` → `createRoot(App)`
4. `LawyerDashboardGate` → Inner → MinimalBoot → Header + HomeTab
5. كشف المنزل = `homeMainGridPaintGate` بعد حجم حقيقي لـ `home-main-grid`

## الأسباب الجذرية (ليست أعراضاً)

1. **عدة مالكين لإزالة الطبقة:** `homeMainGridPaintGate` + `useBootReveal` (إزالة قسرية بعد 320ms من content-ready) + فرع تجريبي في `scheduleBootContentReadyAfterStyles` يكشف بلا سطح. ذلك يرفع البحر على واجهة ناقصة → حاويات بلا هندسة.
2. **تبويب المنزل يسحب المحتوى الثقيل قبل طلاء الفتحات** (استيراد متزامن لـ `HomeTabContent`) فيبقى الانتظار على JS لا على الرسم.
3. **Suspense لكل فتحة** يملأ الأقسام على دفعات بدل التزام واحد.
4. **`isRecoverableBootError` يبتلع TDZ / is not defined** فيُخفي أعطالاً حقيقية.
5. **`homeStaticShellPaintGate` على مسار `index`:** مستمع ميت (الـ HTML لا يرسم منزلاً).

## ما أُنجز

- مالك واحد لإزالة بحر المنزل: `homeMainGridPaintGate`. `useBootReveal` يدير طبقة React فقط؛ الحارس الأقصى يبقى 4ث/14ث.
- مسار واحد لـ `scheduleBootContentReadyAfterStyles` (بلا فرع تجريبي يكشف بلا سطح).
- `LawyerDashboardHomeTab` رفيع: هندسة الفتحات أولاً، `HomeTabContent` كسول بعدها.
- البلاطات تظهر معاً بعد وصول مقطع `commandHub` — لا Suspense لكل صندوق.
- أخطاء TDZ تظهر كفشل إقلاع لا تُبتلع.
- إزالة `homeStaticShellPaintGate` من `index.tsx`.

بلا تغيير ألوان/تصميم.

## التقييم

| البُعد | درجة | صدق |
|--------|------|------|
| أداء | 7.5/10 | العقد صحيح. TTFI على Pixel **غير مقيس**. |
| نظافة | 8.5/10 | مالك واحد + مسار كشف واحد + غلاف رفيع. |
| أمان | 8/10 | أعطال حقيقية لم تعد تُبتلع كـ recoverable. |
| جودة | 8.5/10 | فتحات ثابتة → امتلاء جماعي. |
| موبايل | 7/10 | Capacitor جاهز للعقد؛ بلا قياس جهاز هنا. |
| صدق | 9/10 | البحر حتى React+هيدر+شبكة — قيد معماري معلن. |

## الحدود

- أول إطار HTML يبقى `#0a0f1c` حتى يُسمح بهيكل منزل HTML.
- هيكل الفتحة = زجاج + تسمية + ارتفاع؛ ليس أيقونة البلاطة الكاملة (ذلك تغيير بصري).
- لا ادّعاء رقم TTFI.

## الموقع

جاهز للانتقال من جهة عقد الإقلاع: **نعم**.

اختبارات: 60 اجتازت (honesty + paint gate + session + quiet open).
