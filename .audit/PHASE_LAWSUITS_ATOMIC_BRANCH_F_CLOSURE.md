# Branch F — domain / hooks / sync — إغلاق إصلاحات التدقيق

**تاريخ:** 2026-08-20  
**مصدر التدقيق:** [Atomic audit Branch F](924d64a6-4858-4fa2-98b0-cce88dc512a6)  
**نطاق الإصلاح:** F1 (High) + F3 (Med) + F4 (Low–Med) + F9 جزئي (prop غير مستعمل)

---

## ما أُنجز

| ID | الإصلاح |
|----|---------|
| **F1** | طفرات المقاطع (`trash` / `archive` / restore / permanent / find) تقرأ من القرص عند `null` عبر `resolveLazyLawsuitSegmentForMirror` قبل أي `persist` — لا `?? []`. |
| **F3** | `applyLawsuitConsolidationSegments` + ربط مسار التوحيد (new-case + existing) عبر `setLawsuitSegments` بدل حقن الثانوية في `persistLawsuitFiles` (active). |
| **F4** | `updatedAtMsOf` في `cloudSyncEngine` و`executionCloudPush` يقبل `number` وISO string. |
| **F9** | إزالة `lawsuitSegments` غير المقروء من `useLawsuitFileMutations`. |

**اختبارات:**  
`lawsuitSegmentStorage` (+ hydrate trash + consolidation) · `lawsuitFilesRepository` · `useLawsuitFileMutations.persist` — **pass**.

---

## التقييم (بعد الإصلاح — فرع F فقط)

| البُعد | درجة | ملاحظات |
|--------|------:|---------|
| أداء / استقرار | **8.5** | F1/F3 كانت مخاطر فساد بيانات؛ مغلقة باختبار |
| نظافة | **8** | prop ميت أُزيل؛ تكرار mirror/split لا يزال موجوداً (منخفض) |
| أمان | **8** | tombstones كما كانت؛ LWW أصدق زمنياً |
| جودة / تقسيم | **8** | consolidation عبر API مقطعي واضح |
| موبايل | **N/A (~8)** | لا UI في هذا الفرع |
| صدق | — | C6 + F1/F3/F4 مغلقة بالكود والاختبار |

---

## حدود / لم يُغلق داخل F

- Tombstones جهاز-محلي فقط (F7) — تصميم متعمّد حالياً.
- تكرار `mirrorSegmentsSafe` / `splitFilesByLifecycle` بين repository و segmentStorage (F9 متبقٍ منخفض).
- لم تُشغَّل مجموعة اختبارات المشروع كاملة في هذه الجولة.

---

## جاهز للانتقال

**نعم** — فرع F من برنامج التدقيق الذرّي يمكن إغلاقه والانتقال لفرع A (إن لم يُغلق) ثم B.

**المصداقية:** إغلاق F ≠ إغلاق قسم الدعاوى كاملاً.
