# Phase — Global Search Size / Bulk / Chunk Review

تاريخ: 2026-08-12

## الحكم

مشكلة الحجم **ليست** «chunk الـ Overlay ضخم». الشكل الحالي:

- **محرك البحث (fuse + worker)** مؤجّل بشكل صحيح.
- **InstantShell** أصبح **PaintShell** (حقل+idle) — نتائج/pins عند Host فقط.
- مصدر القسم كبير (~252KB) لأن التغطية واسعة — جزء كبير **قيمة** لا جانك.

## أرقام مصدر (إنتاج، بدون اختبارات)

| منطقة | ملفات | حجم تقريبي | أسطر |
|------|------:|----------:|-----:|
| Overlay UI | 39 | 121 KB | 3342 |
| services/search | 25 | 67 KB | 1742 |
| hooks/dashboard GS | 7 | 24 KB | 627 |
| runtime GS | 6 | 12 KB | 314 |
| other (fuse/warm/index…) | 7 | 27 KB | 785 |
| **مجموع prod** | **85** | **~252 KB** | **~6839** |

أكبر ملفات مصدر: `SearchHeader` 10KB · `globalSearchFuse` 9KB · CSS 8KB · dashboard GS hook 8KB · بُناة الفهرس.

## أرقام dist (من بناء موجود — gzip level 9)

مقاطع GS/اسمها يحتوي search|fuse|globalSearch (19 ملف): **~135 KB خام / ~48 KB gzip**.

| مقطع | raw | gz | دور |
|------|----:|---:|-----|
| `vendor-search-*.js` | 25.7 | 9.3 | fuse.js |
| `readGlobalSearchRecentSearchesSync-*.js` | 25.6 | 8.4 | **واجهة الورقة** (hami-gs + عنوان + نطاقات + idle) |
| `globalSearchIndex.worker-*.js` | 18.0 | 5.4 | worker |
| `globalSearchIndexWorkerClient-*.js` | 18.0 | 5.5 | عميل worker |
| Entry lazy | 6.2 | 2.7 | Host path |
| CSS ورقة | 6.5 | 1.7 | `globalSearchOverlay.css` |
| باقي loaders/warm/fuse wrapper | … | … | مؤجّل |

`index.html` الأولي: **لا** مقاطع GS في الطلب الأول (4 JS فقط) — الورقة ليست blocking للإقلاع، لكنها تُحمَّل مع مسار اللوحة عبر الاستيراد الثابت لـ InstantShell.

`SearchOverlay-*.js` (~7.5KB) = Community SearchOverlay — **خارج** Global Search الشامل.

## خريطة التحميل

```
MainView (ثابت) → GlobalSearchInstantShell → LoadingBridge → StaticShell (UI كامل)
MainView (lazy)  → Entry → Host → StaticShell + Overlay headless (منطق/فهرس)
مؤجّل            → fuse.js + index worker
```

## جانك / تضخّم

| بند | حكم | إجراء |
|-----|-----|--------|
| InstantShell = UI كامل للنتائج على المسار البارد | تضخّم هيكلي | لاحقاً: قشرة paint-only |
| LazyFallback ← InstantShell عند استيراد الإعدادات | **جانك اقتران** | **أُصلح**: `GlobalSearchLazyFallback.tsx` منفصل |
| fuse/worker | قيمة مؤجّلة | الإبقاء |
| بُناة الفهرس الكبيرة | قيمة تغطية المنتج | لا تقسيم لمجرد التقسيم |
| Motion في Overlay | نظيف (0) | — |
| ستارة CSS مكررة | نظيفة | — |
| ratchet dead-exports | ضجيج حارس | لا حذف بدون تحديث baseline |
| Community `SearchOverlay` chunk | قسم آخر | لا يُحسب على GS |

## ما نُفِّذ في هذه المراجعة

1. قياس مصدر + dist + gzip + مواقع الواجهة في المقاطع.
2. فصل `GlobalSearchLazyFallback` عن `LazyFallback` حتى إعدادات اللوحة لا تسحب InstantShell.
3. تحديث اختبار honesty.
4. **(إكمال النقص)** `GlobalSearchOverlayPaintShell` — InstantShell/LoadingBridge بلا ResultsBody/ResultRow/pins.
5. **(إكمال النقص)** فصل `globalSearchA11yIds.ts` عن `CATEGORY_META` icons حتى مسار البرد لا يسحب 16 أيقونة تصنيف عبر SearchHeader.

## الأولوية التالية (إن طُلب)

- إعادة قياس dist بعد بناء جديد لتأكيد انخفاض مقطع الورقة الباردة.
- لا تُعاد Entry ثابتة إلى MainView.

## التقييم

| بُعد | درجة | ملاحظة |
|------|------|--------|
| أداء/حجم | 8.5/10 | Paint-only + فصل أيقونات؛ ينتظر قياس build جديد |
| نظافة حجم | 9/10 | اقتران LazyFallback + نتائج ثقيلة أُزيلا عن المسار البارد |
| صدق | — | بدون rebuild لا نعلن KB gzip جديدة كحقيقة |

## جاهز؟

نعم — تشخيص الحجم + إكمال النقص (PaintShell + a11y split) مُغلق. قياس gzip بعد build جديد اختياري.
