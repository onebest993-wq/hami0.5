# إغلاق — إقلاع دفعة واحدة (one-shot)

تاريخ: 2026-08-13

## السؤال

هل يمكن إقلاع احترافي عالمي **والواجهة تظهر دفعة واحدة**؟

**نعم.** هذا هو العقد المنفَّذ. ليس ادّعاء رقم TTFI على الجهاز.

## ما كان يحدث (سبب المشهد المتقطع والـ >6ث)

ليست «الشاشة بطيئة» وحدها. كان المسار يرسم **منازل وهمية** ثم يكشف البحر عليها:

1. MinimalBoot / FirstPaint يرسم شبكة بهيكل وأزرار `noop`.
2. `querySelector('[data-testid="home-main-grid"]')` كان يأخذ **أول** شبكة في المستند — شبكة الهيكل — فيرفع `#hami-static-boot` على واجهة ناقصة.
3. Inner كان ينتظر `afterFirstTabOpen` قبل FullBoot → شلال: هيكل ثم MainView ثم بلاطات واحدة تلو الأخرى.
4. الأقسام لا تُفتح لأن النقر يقع على الطبقة الميتة أو على `onOpenArchive: noop` حتى يصل MainView.

المستخدم يرى: انتظار طويل، ثم صناديق تتساقط، ثم أزرار لا تعمل.

## العقد العالمي (ما أُنجز)

البحر `#0a0f1c` يبقى حتى **منزل MainView الحقيقي**: هيدر + بلاطات مركز الأوامر في **التزام رسم واحد** + تنقّل حي من `buildLawyerDashboardTabBundle`. ثم تُرفع الطبقة **مرة واحدة**.

| ملف | السلوك |
|-----|--------|
| `LawyerDashboardInner.tsx` | FullBoot فقط. جسر stem تحت Suspense. بلا Minimal فوق الشبكة. |
| `LawyerDashboardFullBootPath.tsx` | بلا HomeFirstPaint. OrchestrationHost مزامَن (لا Suspense فارغ). |
| `HomeTabContent.tsx` | استيراد ثابت لـ `ExecutionHero` / `RouteTile` / `ForumTile` / `DockHalfTile`. |
| `HomeMainGrid.tsx` | `announcePaint` فقط من MainView (`announceBootReveal`). |
| `homeMainGridPaintGate.ts` | يقيس **العقدة المُمرَّرة**؛ لا يكشف إن بقيت طبقة Minimal/FirstPaint. |
| `bootCriticalPreload.ts` | من t=0: FullBoot + OrchestrationHost + MainView + البلاطات. بلا prefetch لـ Minimal. |

حُذف المسار الوهمي الميت: `LawyerDashboardHomeFirstPaint.tsx` و `buildLawyerDashboardHomeFirstPaintModel.ts`.

بلا تغيير ألوان / تخطيط / خطوط.

## التقييم

| البُعد | درجة | صدق |
|--------|------|------|
| أداء | 7/10 | الشلال الوهمي أُزيل. TTFI على Pixel **غير مقيس**. البحر قد يبقى ثواني — هذا انتظار صامت لا واجهة مكسورة. |
| نظافة | 8/10 | مسار كشف واحد. MinimalBoot ما زال في الشجرة/الـ warm ولا يُركَّب من Inner. |
| أمان | 8/10 | بوابة الدخول ما زالت عبر FullBoot + `finalizeBootGateSurface`. لا كشف على أزرار ميتة. |
| جودة | 8.5/10 | مالك كشف واحد. بلاطات الأمر في أول commit. |
| موبايل | 7/10 | العقد يخدم Capacitor؛ بلا قياس جهاز هنا. |
| صدق | 9/10 | لا ادّعاء &lt;6ث. بطاقة المركز (~810ك.ب) ما زالت كسولة داخل هيكل ثابت الحجم. |

## الحدود (معلنة)

- أول إطار HTML يبقى بحراً صامتاً حتى يُسمح بهيكل منزل في HTML.
- بطاقة التنبيهات/المركز تُملأ بعد المقطع الثقيل — الفتحة محفوظة (`HomeHubCardSkeleton`) فلا ينفجر التخطيط.
- `LawyerDashboardMinimalBootPath` و `HomeMainGridFirstPaint` لم يُحذفا؛ ليسا على مسار Inner.
- حارس `useBootReveal` الأقصى (4ث تجريبي / 14ث إنتاج) ما زال يزيل الطبقة إن علق الكشف — آخر ملاذ.
- لا قياس `npm run perf:boot-ttfi` في هذه الجولة.

## الموقع

جاهز للانتقال من جهة **عقد الظهور دفعة واحدة**: **نعم**.

اختبارات هذه الجولة: **77 اجتازت** (honesty + paint gate + boot stack).
