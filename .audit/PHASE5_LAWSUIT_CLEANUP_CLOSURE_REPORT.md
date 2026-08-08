# تقرير إغلاق — الدفعة 5 (تنظيف + بحث مهملات)

**التاريخ:** 2026-08-04  
**النطاق:** إزالة غلاف lifecycle، بحث مهملات من lifecycleIndex، تحديث اختبارات الحوار

---

## ما أُنجز

### 1. حذف كود ميت
- `ArchivePortalLifecycleBars.tsx` — غلاف توافق؛ لا مراجع في `src/`
- (مسبقاً) `ArchivePortalChrome`, `ArchivePortalFileGrid`, `ArchivePortalTrashDialogs`

### 2. بحث شامل — مهملات الدعاوى
- `pushLifecycleIndexEntry` في `globalSearchIndexPure` — يتجاوز `isSearchEntryVisible` لإدخالات metadata فقط
- ملفات `status=deleted` الكاملة ما زالت مخفية (اختبار s4)
- إدخالات `lifecycleIndex` للمهملات: `lifecycle=deleted` + subtitle «سلة المهملات»

### 3. اختبارات
- `lawsuitTrashDialogIdentity` → `LawsuitArchiveTrashDialogs` + `ExecutionArchiveTrashDialogs`
- `globalSearchIndex` — يتحقق من ظهور مهملات الفهرس
- `phase17`, `archivePortalModuleLoad` — ناجحة

### 4. vite
- `resolveArchivePortalChunk` يشير إلى `LawsuitArchiveLifecycleBars` / `ExecutionArchiveLifecycleBars`

---

## التقييم

| البُعد | درجة |
|--------|------|
| أداء | 8/10 |
| نظافة | 9/10 |
| أمان | 7/10 |
| جودة كود | 8/10 |
| موبايل | 7/10 |

---

## حدود

1. **SmartFile تقسيم** — orchestrator ~221 سطر؛ لا monolith حرج؛ لم يُعاد هيكلة
2. **بحث مهملات** — metadata فقط (رقم/عنوان)؛ لا ملاحظات/أطراف من segment غير المحمّل
3. **LawsuitsWorkspaceInstantChrome** — قشرة workspace منفصلة عن Chrome الكامل (مقصود)

---

## جاهز للانتقال؟

**نعم** — مسار الدعاوى/الأرشيف مغلق تقنياً للحد المعقول الآن.
