# Phase — Global Search Cleanliness Deep Audit + Sweep

تاريخ: 2026-08-12

## الحكم

القسم **أنظف بكثير** بعد كنس ميت/مكرر مؤكد بالدليل. ليست «نظافة مطلقة»: بقيت ديون معمارية معلنة (InstantShell/Host تداخل، ألوان تصنيف بنفسجية، ratchet exports).

## ما حُذف / بُسّط (منفَّذ)

| بند | الدليل | الإجراء |
|-----|--------|--------|
| `resultsMaxHeight` بالكامل | ثابت = CSS fallback؛ موبايل flex | حذف السلسلة end-to-end |
| `--gs-keyboard-inset` | يُكتب ولا يُقرأ | حذف؛ الإبقاء على `bottom` |
| `data-keyboard-inset` | بلا مستهلك | حذف |
| `searchHeaderBusy.ts` + اختبار | دائماً `false`؛ إنتاج يستخدم `isGlobalSearchUiLoading` | حذف |
| `ResultRow` icon/accent | تُمرَّر ولا تُستخدم | حذف |
| `SearchHeader.expanded` الميت | دائماً false | استبدال بـ `listExpanded` مربوط فعلياً |
| `useGlobalSearch(onClose)` | param غير مستخدم | حذف |
| `useSearchKeyboard` params ميتة + `useEffect` | Escape عند Host | تنظيف التوقيع |
| `useGlobalSearchLifecycle.reportedRef` | يُصفَّر ولا يُفعَّل | حذف |
| `scheduleGlobalSearchCloseConceal` | إنتاج لا يستوردها | حذف + اختبار |
| ستارة `::before` مكررة | في overlay + app-screen | الإبقاء في `app-screen.css` فقط |
| `motion.button` في Recent | animate noop | أزرار عادية |
| قواعد CSS padding مكررة لـ keyboard | true=0 مكرر | حذف |
| تعليقات «Motion shell» | مسار Motion ميت | تنظيف |
| `SearchResultsPanel` fallback UI-state | إنتاج يمرّر الحالة دائماً | تبسيط props |

## ما بقي عمداً (صدق)

| بند | لماذا KEEP |
|-----|------------|
| `GlobalSearchInstantShell` + LoadingBridge | مسار Suspense بارد قبل Host؛ honesty tests تتطلبها |
| `GLOBAL_SEARCH_OVERLAY_FALLBACK` / LazyFallback | ratchet dead-exports baseline متعمّد |
| `resolveGlobalSearchSheetStyle` داخل layout البحث | مستورد من Radar EventForm — نقل ملكية لاحق |
| قياس كيبورد مزدوج (bridge + chrome) | ضرورية لتبديل bridge→logic بلا وميض |
| `entryMatchesSearchScope` | مساعد نقي + اختبارات scopes |
| ألوان CATEGORY_META البنفسجية | تمييز أقسام لا ورقة البحث |
| مسار non-headless في `index.tsx` | Host headless؛ المسار مفيد لاختبارات معزولة |

## التقييم

| بُعد | درجة | ملاحظة |
|------|------|--------|
| أداء | 8/10 | أقل props/إعادة حساب؛ بلا motion في recent |
| نظافة | 8.5/10 | كنس عميق داخل Overlay؛ ديون Host/Instant معلنة |
| أمان | 9/10 | لا مساس بمنطق الاستعلام/الصلاحيات |
| جودة كود | 8/10 | سلسلة shell أبسط؛ a11y listExpanded مربوط |
| موبايل | 8/10 | لم يُكسر عقد الكيبورد/flex من إعادة التصميم |
| صدق | — | ما تبقّى مُدرج أعلاه — لا « downstream لاحقاً» داخل ما أُنجز |

## تحقق

`vitest`: 15 ملف / **65** اختبار — ناجحة (Overlay + instantPaint + honesty + dashboard GS hook).

## جاهز للانتقال؟

نعم — كنس النظافة داخل نطاق البحث مُغلق بصدق. طي InstantShell→LoadingBridge مشروع منفصل إن رُغب لاحقاً.
