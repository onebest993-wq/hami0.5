# خارطة طريق: TypeScript، تقسيم التنفيذ، قياس الأداء

هدفها **جودة الكود والصيانة** دون تغيير الشكل أو التصميم.

## المرحلة A — `@ts-nocheck` (تدريجي)

| أولوية | المجال | ملاحظات |
|--------|--------|---------|
| A1 | أدوات مساعدة بلا JSX | ✅ `reactOptimizations.ts` بدون `@ts-nocheck`. ✅ `useExecutionDashboard.ts` يطابق `executionDashboardStore` (واجهة Zustand فقط). |
| A2 | خدمات ووحدات منطق | `SupabaseService`، محركات الحساب بعد تثبيت الأنواع |
| A3 | مكوّنات UI (shadcn) | كثيرة؛ تُعالج دفعة واحدة أو مع ترقية القالب |
| A4 | لوحات ضخمة | `ExecutionDashboard.tsx` بعد تقسيم الدالة الرئيسية |

**قاعدة:** إزالة سطر `@ts-nocheck` فقط بعد أن يمرّ `npm run typecheck` على الملف أو على المشروع.

## المرحلة B — تقسيم `ExecutionDashboard.tsx`

1. **تم:** استخراج الحدود الكسولة + `PartyOverflowToggle` + `formatUnifiedLedgerDate` + `AR_TABLIGH_RAQM` إلى `ExecutionDashboard/executionDashboardLazyShell.tsx` (نفس الـ markup).
2. **تم:** نوافذ `ExecutionDashboard.tsx` مدمجة مع Zustand: `state.modals` بمفاتيح `show*Modal` (إغلاق تلقائي عند تغيّر `executionData.id`).
3. **تم (ربط تقني دون تغيير الشكل الظاهر):** `ExecutionDashboardModularHost` يغذّي `ExecutionHeader` / `ExecutionPartiesSection` / `ExecutionPaymentsSection` / `ExecutionTimelineSection` / `ExecutionActionsBar` داخل غلاف `hidden`؛ العرض الرئيسي للمستخدم يبقى كما هو. التبويب السفلي `activeBottomTab` ورأس الـ accordion `isHeaderExpanded` من Zustand (`resetUIPanelsForExecutionContext` عند تغيّر الملف وعند unmount).
4. **لاحقاً (اختياري):** استبدال JSX الضخم تدريجياً بالمكوّنات المجمّعة بعد مواءمة بكسل-بكسل، أو إزالة الغلاف `hidden` عند الجاهزية.

**أداء:** `ExecutionDashboardModularHost` مُستورد مع اللوحة الرئيسية (بدون `lazy`) لتفادي أعطال HMR/تعلّق `Suspense`؛ الحزمة الأثقل تبقى مقسّمة عبر واردات ديناميكية أخرى داخل الشاشة.

### تمرير أداء (آذار 2026) — بدون تغيير الشكل

| البند | التفاصيل |
|--------|-----------|
| Vite `build.target` | `es2020` لحجم أصغر وتفسير أسرع على المتصفحات الحديثة |
| esbuild `drop` | في `vite build`: `console` + `debugger` لتقليل حجم الحزمة وعمل وقت التشغيل |
| Sentry | في `PROD`: `tracesSampleRate` ≈ 12%، `replaysSessionSampleRate` ≈ 2% — أخف على الشبكة والمعالج مع الإبقاء على `replaysOnErrorSampleRate: 1` |
| Prefetch | موجتان خفيفتان + `prefetchLawyerHeavyDeferredChunks()` للوحدات الأثقل (تنفيذ، دعاوى، ملف ذكي) بعد استقرار الخمول لتقليل التزاحم على الشبكة عند الدخول للوحة المحامي |
| تقسيم كسول داخل التنفيذ | نوافذ/لوحات نادرة (`محضر المتابعة` — تبويب شخصي، تخلية ميدانية، حالات خاصة، موعد المنفذ، تأكيد المحضر) تُستورد بـ `React.lazy` من `executionDashboardLazyShell.tsx` لتخفيف حزمة `ExecutionDashboard-*.js` دون تغيير المسار الوظيفي |
| `useTransition` في `App.tsx` | `setScreen` يمر عبر `startTransition` لتقليل تعطيل الواجهة عند التبديل إلى شاشات ثقيلة (lazy) |
| مفاتيح قوائم الأطراف | دائن/مدين: مفتاح مستقر `id` أو `c-{idx}` / `d-{idx}` لتفادي خلط الحالة عند غياب المعرّف أو قيمة فارغة |

### تخزين CDN / الخادم (عند النشر)

- **`index.html`:** `Cache-Control: no-cache` أو `max-age=0` + `must-revalidate` حتى يحصل العميل على إشارة تحديث بعد كل نشر.
- **`assets/*.js` و `assets/*.css` (أسماء مع hash):** `Cache-Control: public, max-age=31536000, immutable` — الحجم الأكبر يُخزَّن طويلاً لأن الملف يتغيّر بالاسم عند البناء.
- **تفاصيل جاهزة للنسخ:** `docs/DEPLOY-CACHE-HINTS.md`

## المرحلة C — قياس أداء على أجهزة حقيقية

1. **داخل التطبيق (تطوير):** `initWebVitalsLogging()` في `src/index.tsx` يسجّل LCP و CLS في الـ console عند `import.meta.env.DEV`. للهاتف: Chrome → `chrome://inspect` → Remote debugging.
2. **Lighthouse (يدوي):**  
   `npx lighthouse http://localhost:8080 --only-categories=performance --view`  
   (شغّل السيرفر أولاً، واستهدف مساراً يمثل الاستخدام الفعلي.)
3. **React Profiler:** React DevTools → Profiler → تسجيل أثناء فتح لوحة التنفيذ والتمرير.
4. **إنتاج (اختياري لاحقاً):** ربط مقاييس Web Vitals بـ Sentry أو Analytics عند الحاجة — بدون تغيير واجهة المستخدم.

### لاحقاً (أثر عالٍ — دفعات)

- **قوائم طويلة جداً:** مراجعة عناصر بلا `id` ثابت؛ عند الحاجة `virtualization` (مثل `@tanstack/react-virtual`) لقوائم المئات+ — فقط بعد قياس Profiler.
- **مزامنة Lighthouse + Profiler** مع سيناريو «فتح ملف تنفيذ + تمرير + فتح محضر المتابعة» لرصد LCP/INP بعد كل دفعة تقسيم.

## أوامر سريعة

### اختبارات `useCloudSync`

- تمت مزامنة الـ mock مع الواجهة الفعلية لـ `SupabaseService` (`checkUserAuth`, `getExecutionFiles`, …) واستخدام مفتاح يحتوي `execution` (مثل `lawyer-execution-files`) لمسار المزامنة.
- عند مفتاح غير مدعوم: إعادة الحالة إلى `idle` وعدم ترك `isSyncing` معلّقاً (إصلاح منطق في `useCloudSync.ts`).

```bash
npm run typecheck
npm run health
npm run build
npx vitest run src/app/hooks/__tests__/useCloudSync.test.ts
```

آخر تحديث: آذار 2026 (تقسيم كسول تنفيذ + `useTransition` تنقل + توثيق كاش النشر)
