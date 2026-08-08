# الدفعة 2 — إغلاق صادق (أداء/عزل بيانات الدعاوى)

**التاريخ:** 2026-08-04  
**النطاق:** boot خفيف، فهرس O(1)، مقاطع تخزين، lazy load مخزن/مهملات، حفظ تزايدي

---

## ما أُنجز

| مرحلة | المحتوى | الحالة |
|-------|---------|--------|
| 2.0 | `lawsuitLifecycleIndex` + `lawsuitSegmentStorage` + `.audit/lawsuit-perf-baseline.json` | ✅ |
| 2.1 | عدّادات O(1) في Controller من `lawsuitLifecycleCounts` | ✅ |
| 2.2 | مفاتيح `lawyer_files_active/archived/trash/index` + ترحيل monolithic | ✅ |
| 2.3 | `persistLawsuitActiveRecord` + segment mutations مع حفظ delta | ✅ |
| 2.4 | Controller/overlay/workspace wiring + lazy `ensure*Loaded` | ✅ |
| 2.5 | LRU سحابة | ⏸ خارج النطاق (اختياري — لا blocker) |

### ملفات جديدة
- `src/app/domain/lawsuit/lawsuitLifecycleIndex.ts`
- `src/app/domain/lawsuit/lawsuitSegmentStorage.ts`
- `src/app/domain/lawsuit/__tests__/lawsuitLifecycleIndex.test.ts`
- `src/app/domain/lawsuit/__tests__/lawsuitSegmentStorage.test.ts`
- `.audit/lawsuit-perf-baseline.json`

### ملفات معدّلة (جوهرية)
- `lawsuitFilesRepository.ts` — مقاطع + mutations segment-aware
- `useLawsuitFilesState.ts` — boot نشطة + فهرس، lazy segments
- `useLawsuitFileMutations.ts` — نقل بين مقاطع
- `useLawsuitArchivePortalController.ts` — عدّادات O(1) + مصدر مقطع
- `LawyerDashboardLawsuitsOverlayEntry` / `LawsuitsWorkspaceHost` / bundles
- `dossierStorageKeys.ts` — مفاتيح المقاطع

### اختبارات
- `lawsuitLifecycleIndex.test.ts` — 5/5
- `lawsuitSegmentStorage.test.ts` — 4/4
- `lawsuitFilesRepository.test.ts` — 4/4  
**المجموع: 13/13 ناجح**

---

## التقييم (كل بُعد)

| البُعد | الدرجة | ملاحظة |
|--------|--------|--------|
| **أداء** | 8/10 | boot يحمّل النشطة+فهرس فقط؛ مخزن/مهملات lazy؛ لا O(n) filter للعدادات |
| **نظافة** | 8/10 | domain منفصل؛ مرآة monolithic للتوافق |
| **أمان** | 7/10 | نفس مسار SecureStore؛ wipe guard عبر syncLite |
| **جودة كود** | 8/10 | فصل index/segments/repository/state |
| **موبايل** | 7/10 | أقل parse عند boot — يدعم Capacitor لاحقاً |

---

## الحدود (صريحة)

1. **البحث العالمي** — يستخدم `data.files` (نشطة فقط)؛ المؤرشفة غير مفهرسة حتى تحميل المقطع أو الدفعة 3.
2. **مرآة `lawyer_files`** — تُحدَّث للتوافق مع cloud/backup؛ المصدر المنطقي هو المقاطع.
3. **LRU سحابة (2.5)** — لم يُنفَّذ؛ اختياري.
4. **لا تغيير بصري** — مُلتزم.

---

## جاهز للانتقال للدفعة 3؟

**نعم** — الدفعة 2 مغلقة بتحقق اختبارات. الدفعة 3: تقسيم Chrome/Grid chunks (`LawsuitArchiveChrome`, `lawsuit-archive-grid`).

---

## المصداقية

- لم يُنفَّذ: LRU سحابة، فهرسة بحث للمؤرشفة، تقسيم مكوّنات (الدفعة 3).
- لم يُجرَ prod build كامل في هذا الإغلاق — اختبارات vitest domain فقط.
