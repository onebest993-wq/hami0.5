# إصلاح جذري لمسار الإقلاع — ٢٠٢٦-٠٨-١٣

## التشخيص (جرد صادق)

الإقلاع لم «يرجع كما كان» صدفة. طبقات متسابقة أُضيفت كتحسينات فصار المسار أسوأ:

1. **علامة جاهزية كاذبة:** `MinimalBoot` كان يعلن `first-tab` + TTFI عند وجود النموذج — قبل تحميل Header/HomeTab وقبل أي طلاء شبكة.
2. **ذلك الإطلاق الكاذب ركّب FullBoot فوراً** فزاحم شبكة الهاتف/المعالج مقطع المنزل الحقيقي → تأخر أول طلاء → الطبقة الصامتة تبقى أطول.
3. **ثلاثة منازل متتالية:** Minimal → HomeFirstPaint (يسرق الشاشة عبر `onShellInteractive`) → MainView. رعشة، أزرار ميتة، ثم إعادة رسم.
4. **spark + secretary على المسار الحرج** قبل first-tab — وزن بلا نفع لأول إطار.
5. **بوابة الدخول** كانت أصلاً تكشف عبر `useBootGateSurfaceReady` — لم تُكسر في هذه الموجة.

العقد السابق في `PHASE_BOOT_HONEST_FIRST_TAB.md` ادّعى صدقاً وما زال يعلّم من commit Minimal. القياس كان يسبق العين.

## ما أُنجز

| # | الإصلاح | الموضع |
|---|---------|--------|
| 1 | مصدر حقيقة واحد: `notifyHomeMainGridPainted` يعلن first-tab + TTFI + content-ready ثم يزيل الطبقة | `homeMainGridPaintGate.ts` |
| 2 | Minimal لا يعلن جاهزية قبل الطلاء | `LawyerDashboardMinimalBootPath.tsx` |
| 3 | HomeTab يجدول طلاء الشبكة فقط | `HomeTabContent.tsx` |
| 4 | Minimal يبقى حتى جاهزية MainView — لا سرقة شاشة | `LawyerDashboardInner.tsx` |
| 5 | أثناء تغطية Minimal: لا HomeFirstPaint (منزل ثانٍ) | `LawyerDashboardFullBootPath.tsx` |
| 6 | spark/secretary بعد first-tab؛ تسخين Header مع المنزل | `bootCriticalPreload.ts` + `lawyerDashboardFirstTabWarm.ts` |

المسار الجديد:

```
سطح صامت #0a0f1c
  → Minimal (هيكل المنزل)
  → paint شبكة حقيقية بحجم > 0
  → كشف + TTFI + first-tab
  → FullBoot/MainView تحت الطبقة
  → تبديل واحد عند جاهزية MainView
```

بوابة الدخول: بدون تغيير عقد — `finalizeBootGateSurface` بعد إطارَي paint.

## التقييم (بلا مبالغة)

| البُعد | الدرجة | السبب |
|--------|--------|--------|
| أداء / استقرار الإقلاع | 7.5/10 | الجذر المنطقي أُغلق؛ TTFI حيّ على Pixel لم يُقَس في هذه الجلسة |
| نظافة | 8.5/10 | مصدر حقيقة واحد للعلامات؛ اختبارات العقد حُدّثت |
| أمان | ن/أ لهذا المقطع | لا مساس بتخزين/تفويض |
| جودة كود | 8/10 | مسار واحد بدل ثلاث منازل؛ HomeFirstPaint يبقى كمخرج profile-promote |
| موبايل | 8/10 | native splash ما زال عبر `markBootRevealDone` → `notifyNativeBootReady`؛ طبقة HTML صامتة |
| صدق | إلزامي | لا ادّعاء «عالمي <٣ث» دون قياس جهاز |

## الحدود — صريح

- لم يُشغَّل `perf:boot-ttfi` على Pixel مخنوق في هذه الجلسة.
- HomeFirstPaint لم يُحذف بالكامل — يُستخدم إن رُفع Minimal مبكراً (ترقية ملف شخصي قبل MainView).
- عدد الـchunks ووزن HomeTab نفسه لم يُمسّا في هذه الموجة.
- جهاز Android أصلي (Capacitor splash) يحتاج hard refresh / إعادة تثبيت للتحقق البصري.

## جاهز للانتقال؟

**نعم لمسار الإقلاع كعقد هندسي** — بشرط تحقق المستخدم بصرياً: إقلاع بارد → سطح صامت → منزل واحد بلا وميض أسود وبلا إعادة رسم الهيدر.

**لا كهدف TTFI عالمي** حتى يُقاس الجهاز.
