# نظافة قسم البحث الشامل — إغلاق صادق

**التاريخ:** ٣٠ آب ٢٠٢٦  
**النطاق:** البحث الشامل (هيدر + ورقة `GlobalSearchOverlay` + خدمات الفهرس/Fuse + شِل اللوحة). بلا بحث المنتدى أو المستودع أو الأرشيف.  
**سابق:** `.audit/PHASE_GLOBAL_SEARCH_CLEANLINESS_SWEEP.md` و`PASS2` (آب ١٢). هذه موجة جديدة على الشجرة الحالية، لا إعادة ادّعاء لتلك الفحوصات.

## ما أُنجز

### دوال وكاش ميت
| عنصر | الحكم |
|------|--------|
| `isGlobalSearchPipelineWarm` | بلا استدعاء — التسخين الحي `warmGlobalSearchPipeline` |
| `queryHasHighlightableMatch` | بلا مستهلك — التظليل عبر `buildSafeHighlightPattern` |
| `isGlobalSearchWorkerAvailable` / `terminateGlobalSearchIndexWorker` | بلا مستهلك |
| `getCachedGlobalSearchOverlay` + المتغيّر `cachedGlobalSearchOverlay` | كتابة بلا قراءة |
| `resetGlobalSearchOverlayModuleCacheForTests` / `resetGlobalSearchOverlayModuleStateForTests` | بلا اختبارات |
| `createGlobalSearchFuse` | بقي داخلياً لـ `getOrCreateGlobalSearchFuse` |
| `prefetchGlobalSearchOverlay` | لم يعد تصديراً — يُستدعى من `loadGlobalSearchOverlayWithEngine` فقط |
| `removeGlobalSearchInstantBridge` ومهلة فك القفل | بقيتا داخليتين |
| `resetGlobalSearchShell` + تسريب `setShowGlobalSearch` / `setSearchIndexVersion` / `setGlobalSearchInitialQuery` من الشِل | بلا مستهلك خارجي — الفتح/الإغلاق عبر `openGlobalSearch` / `closeGlobalSearch` |

### تكرار وُحِّد
- تلميح الخمول وشرائح التصنيف: مصدر واحد `searchScopeChipLabels.ts` — الورقة الحية وجسر الطلاء و`InstantSheetChrome`.
- `isLoadingExtras`: سلسلة كاملة بلا قراءة في الواجهة (المؤشر من `isBuildingIndex`).
- `isSearching` / `debouncedQuery` من `useSearchQuery`: لم تكن تُمرَّر للإنتاج — الحالة الموحّدة `searchUiState`.
- برميل `constants.ts` كان يعيد تصدير معرّفات a11y بلا مستورد.
- CSS: قاعدة تجميد اللوحة الأصلية مطابقة للعامة؛ `:not(ios)` على الخلفية كان مغطى بقاعدة native أشمل. حُذف `reduce-motion` على شرائح بلا `transition`.
- مراقب التفاعل: بقايا `data-search-instant-shell` بعد حذف InstantShell.
- `userId` في `useGlobalSearchHostLifecycle`: معامل غير مستخدم.

### تصديرات داخلية أُغلقت
أنواع Props/Options لمعظم مكوّنات الورقة والخطافات، ومساعدات `sanitizeSearch*`، و`GlobalSearchPerfPhase`، وأنواع فتح/إغلاق الشِل.

قفل الصدق: `globalSearchCleanlinessHonesty.test.ts`.

## الاختبارات

Vitest لقسم البحث (Overlay، خدمات search/Fuse/index، runtime، شِل اللوحة، تسخين، home-fx critical، overlays.search، instantPaint، boot hydrator): **٥٥ ملفاً، ٢٢٢ اختباراً — ناجحة**.

## التقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8 | أقل كود ميت على المسار؛ بلا قياس جهاز/حزمة |
| نظافة | 8 | حذف حقيقي؛ قشرة الطلاء ما زالت نسختين عمداً |
| أمان | 8 | لم يُمسّ عقد التنقّل/الأخيرة؛ المساعدات بقيت داخل المُنقّي |
| جودة | 8 | تسميات التصنيف مصدر واحد؛ سلسلة extras أبسط |
| موبايل | 8 | لم تُضعَف 44px / لوحة المفاتيح / safe-area |
| صدق | 9 | انظر الحدود |

**جاهز للانتقال:** نعم لهذه الموجة.

## الحدود — ما لم يُنفَّذ صراحةً

- قشرة الفتح الفوري ما زالت نسختين عمداً: جسر `innerHTML` (`globalSearchInstantSheetHtml`) و`GlobalSearchInstantSheetChrome` React — حتى لا يُسحب الفهرس/Fuse إلى مسار العدسة.
- «الأخيرة»: `peekGlobalSearchRecentSearches` (localStorage، الطلاء) مقابل `readGlobalSearchRecentSearchesSync` (SecureStore، الطبقة الحية) — عمداً.
- تجميد اللوحة ما زال في CSS الحرج للمنزل **وفي** `gsLayer.css` — الحرج يُحمَّل قبل مقطع الورقة.
- `globalSearchInstantPaint.ts` ~٣٠٠ سطر؛ `globalSearchFuse.ts` ~٢٥٢. لم يُقسما في هذه الموجة.
- بحث المنتدى / المستودع / الأرشيف خارج النطاق.
- لم يُشغَّل Playwright ولا `tsc` كامل ولا جهاز.
