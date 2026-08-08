# Phase 2 — إغلاق توحيد domain/seizure

**التاريخ:** 2026-08-05  
**الحالة:** مغلقة

## ما أُنجز

| المكوّن | النتيجة |
|---------|---------|
| `seizureWorkflowStatus.ts` | حالات/قرارات مشتركة |
| `seizureWorkflowPropertyAdapter.ts` | مسار العقار عبر PLUGIN |
| `seizureWorkflowMovableAdapter.ts` | مسار المنقول عبر PLUGIN |
| `propertySeizureWorkflowUtils.ts` | re-export فقط (~5 سطر) |
| `movableSeizureWorkflowUtils.ts` | re-export فقط (~5 سطر) |
| `seizureWorkflowDecisionQueries.ts` | لا يعتمد على Dashboard utils |
| `buildSeizureWorkflowStepHistory` | `estimatedPriceIqd` + `titleTransfer` |

## التحقق

| الفحص | النتيجة |
|-------|---------|
| Vitest domain/seizure | 8 + 6 adapter |
| Vitest ExecutionDashboard utils | 83 |
| probe-seizure-workflow | 9/9 |
| probe-followup-stubs | 11/11 |

## التقييم

| البُعد | الدرجة | ملاحظة |
|--------|--------|--------|
| أداء | 9/10 | probes نظيفة |
| نظافة | 9/10 | ~800 سطر مكرر أُزيل |
| أمان | 8/10 | نفس منطق التحقق، مصدر واحد |
| جودة كود | 9/10 | plugins + adapters + queries |
| موبايل | — | لا تغيير UI |
| صدق | 9/10 | debt متبقي: `seizureWorkflowDossierUtils` في Dashboard |

## حدود Phase 2

- `seizureWorkflowDossierUtils` و `seizureInlineFocusUtils` لم تُنقل — خارج نطاق property/movable utils
- المسارات القديمة للـ import ما زالت تعمل عبر re-export

## جاهز للانتقال

**نعم** → Phase 3 (محضر المتابعة)
