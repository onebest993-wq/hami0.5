# تقرير إغلاق — الدفعة 4 (هيكل + بحث + تنظيف)

**التاريخ:** 2026-08-04  
**النطاق:** فصل مكوّنات دعاوى، تقسيم controller، توحيد scroll Instant، بحث lifecycleIndex، حذف shim

---

## ما أُنجز

### 1. مكوّنات دعاوى معزولة
| ملف | الدور |
|-----|--------|
| `LawsuitArchiveLifecycleBars.tsx` | تبويبات نشطة/أرشيف/سلة — دعاوى فقط |
| `LawsuitArchiveTrashDialogs.tsx` | حوارات مهملات/حذف جزائي/حذف نهائي — دعاوى |
| `ExecutionArchiveLifecycleBars.tsx` | تبويبات التنفيذ |
| `ExecutionArchiveTrashDialogs.tsx` | حوارات التنفيذ |
| `archiveLifecycleSegmentUi.tsx` | `LifecycleSegment` + `CountBadge` مشتركان |
| `ArchivePortalConfirmDialog.tsx` | حوار تأكيد مستخرج |

`LawsuitArchiveChrome` و `ExecutionArchiveChrome` يستوردان المكوّنات المعزولة مباشرة.

### 2. تقسيم `useLawsuitArchivePortalController`
| ملف | الدور |
|-----|--------|
| `useLawsuitArchivePortalDossierState.ts` | بحث، تبويب اختصاص، view mode، prefetch جزائي |
| `useLawsuitArchivePortalTrashState.ts` | lifecycle UI، سلة، حوارات حذف |
| `lawsuitArchivePortalFiltering.ts` | فلترة pure — ملفات/جزائي/مصدر segment |
| `useLawsuitArchivePortalController.ts` | orchestrator (~220 سطر) |

### 3. توحيد Instant scroll
- `lawsuitArchiveInstantLayout.ts` — `LAWSUIT_ARCHIVE_SCROLL_REGION_CLASS`
- `LawsuitsCivilArchiveInstantShell` + `LawsuitArchiveChrome` يستخدمان نفس الثابت

### 4. بحث شامل — `lifecycleIndex`
- `globalSearchIndexLawsuitLifecycleEntries.ts` — إدخالات metadata للمؤرشف غير المحمّل
- `BuildGlobalSearchIndexInput.lawsuitLifecycleIndex`
- تمرير من `LawyerDashboardGlobalSearchOverlayEntry` + warm snapshot
- **حد:** `lifecycle=deleted` يُستبعد عمداً (`isSearchEntryVisible`) — المهملات لا تظهر في البحث (سلوك موجود)

### 5. تنظيف
- حُذف `ArchivePortalFileGrid.tsx` (shim)
- حُذف `ArchivePortalTrashDialogs.tsx` (monolith)
- `ArchivePortalLifecycleBars.tsx` → غلاف توافق فقط

---

## اختبارات
- `lawsuitLifecycleIndex` — 5/5
- `globalSearchIndex` — 5/5 (بما فيها lifecycleIndex archived)
- `phase17ArchiveContentCut` — 6/6

---

## التقييم الصادق (المعايير الخمسة)

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| **أداء** | 8/10 | فصل chunks محفوظ؛ controller أخف؛ بحث مؤرشف بلا تحميل segment |
| **نظافة** | 8/10 | monolith trash/chrome محذوف؛ shim محذوف؛ غلاف lifecycle للتوافق فقط |
| **أمان** | 7/10 | لا تغيير في مسارات الحذف؛ metadata بحث خفيفة |
| **جودة كود** | 8/10 | hooks + pure filtering؛ confirm dialog مستخرج |
| **موبايل** | 7/10 | scroll موحّد؛ لا تغيير touch/layout |

---

## الحدود (لم تُغلق هنا)

1. **بحث المهملات:** metadata موجودة في الفهرس لكن `deleted` مخفية من نتائج البحث — يحتاج قرار منتج إن أُريد إظهارها.
2. **`ArchivePortalLifecycleBars`:** غلاف توافق — يُحذف عند إزالة كل المراجع.
3. **`LawsuitsWorkspaceInstantChrome`:** قشرة workspace كاملة لم تُدمج مع `LawsuitArchiveChrome` (مقصود — مساران مختلفان).
4. **SmartFile تقسيم:** خارج نطاق هذه الدفعة.

---

## جاهز للانتقال؟

**نعم** — للدفعة التالية (SmartFile / بحث مهملات / إزالة غلاف lifecycle) إن طُلب.

**المصداقية:** لا تقييم «ممتاز كامل» — غلاف lifecycle + بحث مهملات + SmartFile لم يُنفَّذ.
