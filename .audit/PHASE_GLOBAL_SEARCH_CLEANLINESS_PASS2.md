# Phase — Global Search Cleanliness Pass-2 (harder)

تاريخ: 2026-08-12

## جواب السؤال

**لا — الفحص الأول لم يكن أقصى عمق ممكن.**  
Pass-2 كشف تراباً حقيقياً فات الكنس الأول. أُصلح. ما زال هناك بقايا **مُعلنة** (ratchet exports / InstantShell مسار بارد).

## ما اكتُشف وأُصلح في Pass-2

| بند | النوع | الإجراء |
|-----|------|--------|
| `first-paint` مزدوج (Entry + Overlay lifecycle) | تكرار قياس | حذف `useGlobalSearchLifecycle` — SSOT = `useGlobalSearchShellLifecycle` |
| `aria-controls` → listbox بلا `id` | عطب a11y | `id={GLOBAL_SEARCH_LISTBOX_ID}` + `role="listbox"` على نتائج |
| `isSearching` / `isLoadingIndex` في سلسلة الـ shell | ميت بعد ResultsRegion | حذف من shell types/bridge/StaticShell |
| InstantShell Escape/back منسوخ | تكرار منطق | توحيد عبر `useGlobalSearchOverlayDismiss` |
| `prefers-reduced-motion` على sheet بلا transition | CSS ميت | حذف |
| `backdropArmed = open` | tautology | تبسيط `pointerEvents` |

## ما بقي عمداً بعد Pass-2

| بند | لماذا |
|-----|------|
| InstantShell + LoadingBridge | Suspense بارد + honesty |
| `GLOBAL_SEARCH_OVERLAY_FALLBACK` وأشباهه | dead-exports baseline متعمّد |
| `createGlobalSearchFuse` / `isGlobalSearchPipelineWarm` / worker helpers / `isGlobalSearchShellSnappedOpen` | في baseline كـ ratchet — حذفها يكسر الحارس بلا فائدة منتج |
| `resolveGlobalSearchSheetStyle` داخل GS layout | يملكه Radar import |
| قياس كيبورد مزدوج bridge+chrome | ضروري لتبديل المحتوى بلا وميض |
| ألوان CATEGORY_META | تمييز أقسام |

## تحقق

vitest Overlay + honesty + instantPaint + GS hook: **65** ناجحة.

## صدق التقييم

| بُعد | درجة |
|------|------|
| نظافة | 9/10 داخل Overlay الإنتاجي — ليس 10 بسبب ratchet/InstantShell |
| صدق | الفحص الأول كان قوياً لكنه **ناقص**؛ Pass-2 أغلق الفجوات المكتشفة |

## جاهز؟

نعم لإغلاق نظافة القسم بصدق أعلى. أي فحص ثالث سيكون تناقص عوائد ما لم يتغيّر المسار المعماري (طي InstantShell).
