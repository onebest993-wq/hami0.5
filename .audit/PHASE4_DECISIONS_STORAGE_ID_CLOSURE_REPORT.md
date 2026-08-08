# Phase 4 — إغلاق decisionsStorageExecutionId على الحدود

**التاريخ:** 2026-08-05  
**الحالة:** مغلقة (النطاق المخطط)

## ما أُنجز

| المكوّن | الدور |
|---------|------|
| `requireDecisionsStorageExecutionId.ts` | معرّف موحّد على حدود الإضبارة |
| `coalesceDecisionsStorageExecutionId` | للـ props الاختيارية (undefined عند default) |
| boot pipeline | المصدر الأول: `resolveDecisionsStorageExecutionId` + parent merge |
| ~25 ملف | استبدال سلاسل `?? executionId ?? executionData?.id` |

## الملفات المحورية المحدّثة

- inline save (property/movable)
- seizure asset modal handlers + outcome pipeline
- followup tab assembly + modal panels
- ledger sync, claim financials, settlement
- unified seizure log entries/footer
- guarantor/third party handlers
- phone body scope + resident handlers

## التحقق

| الفحص | النتيجة |
|-------|---------|
| Vitest requireDecisionsStorageExecutionId | 3 tests |
| Vitest resolveDecisionsStorageExecutionId | 6 tests |
| probe-seizure-workflow | 9/9 |
| probe-followup-stubs | 11/11 |

## حدود Phase 4

- مسارات تستخدم `executionData?.id ?? executionId` لغير تخزين القرارات (timeline, grace UI, payment) — مقصودة
- `patchExecutorDecisionRow(executionData?.id ?? executionId)` في بعض handlers — تحتاج مراجعة لاحقة

## جاهز للانتقال

**نعم** → Phase 5 (bridges ميتة + CI gates)
