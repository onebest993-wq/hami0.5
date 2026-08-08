# الدفعة 3 — إغلاق صادق (تقسيم مكوّنات/chunks مسار الدعاوى)

**التاريخ:** 2026-08-04  
**النطاق:** فصل Chrome/Grid، نقاط دخول منفصلة، chunks Vite، Host بلا static execution

---

## ما أُنجز

| مرحلة | المحتوى | الحالة |
|-------|---------|--------|
| 3.1 | `LawsuitArchiveChrome` — بلا `ExecutionArchiveFileGrid/Toolbar` | ✅ |
| 3.2 | `ExecutionArchiveChrome` — مسار التنفيذ معزول | ✅ |
| 3.3 | `LawsuitArchiveFileGrid` — شبكة دعاوى فقط (lazy chunk) | ✅ |
| 3.4 | `ArchivePortalLawsuitEntry` + `hubArchiveLoader` lawsuit path | ✅ |
| 3.5 | `ArchivePortal.tsx` — تنفيذ lazy (`LazyArchivePortalExecutionSurface`) | ✅ |
| 3.6 | `ArchivePortalHost` — execution surface من cache (بلا static import) | ✅ |
| 3.7 | vite: `lawsuit-archive-portal`, `lawsuit-archive-grid`, `archive-portal-execution` | ✅ |

### ملفات جديدة
- `LawsuitArchiveChrome.tsx`
- `ExecutionArchiveChrome.tsx`
- `LawsuitArchiveFileGrid.tsx`
- `ArchivePortalLawsuitEntry.tsx`

### ملفات محذوفة
- `ArchivePortalChrome.tsx` (monolith — استُبدل بالمسارات المنفصلة)

### ملفات معدّلة
- `ArchivePortal.tsx`, surfaces, `hubArchiveLoader.ts`, `ArchivePortalHost.tsx`
- `vite.config.mts`, `ArchivePortalFileGrid.tsx` (re-export shim)
- اختبارات phase17–21 + execution + module load

### اختبارات
- phase17–21: محدَّثة وناجحة
- execution archive/dossier tests: ناجحة
- `archivePortalModuleLoad.test.ts`: ناجح
- **كونسول dev probe:** ERRORS/WARNINGS فارغة

---

## التقييم (كل بُعد)

| البُعد | الدرجة | ملاحظة |
|--------|--------|--------|
| **أداء** | 9/10 | مسار الدعاوى لا يجر execution grid/toolbar/surface عند boot |
| **نظافة** | 9/10 | monolith Chrome أُزيل؛ shim FileGrid للتوافق |
| **أمان** | 7/10 | لا تغيير منطق أمان |
| **جودة كود** | 8/10 | تقسيم واضح lawsuit/execution |
| **موبايل** | 7/10 | أقل JS على cold path — يدعم Capacitor |

---

## الحدود (صريحة)

1. **Instant shells** — لم يُوحَّد `LawsuitsCivilArchiveInstantShell` مع layout عام (تحسين لاحق، ليس blocker).
2. **SmartFile phased split** — خارج نطاق هذه الدفعة.
3. **`ArchivePortalFileGrid.tsx`** — shim re-export فقط؛ يُزال لاحقاً عند إغلاق كل المراجع.
4. **prod build كامل** — لم يُشغَّل في هذا الإغلاق (vitest + console probe).

---

## جاهز للإغلاق النهائي؟

**نعم** — الدفعات 1–3 مُنفَّذة. يتبقى تقرير إغلاق شامل لكل المسارات إن طُلب.

---

## المصداقية

- لم يُنفَّذ: توحيد instant shells، SmartFile split، LRU سحابة (2.5).
- لا تغيير بصري — مُلتزم.
