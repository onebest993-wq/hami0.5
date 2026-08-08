# Phase 5 — إغلاق جسور handler-cluster الميتة + بوابة CI للـ probes

**التاريخ:** 2026-08-05  
**الحالة:** مغلقة (النطاق المخطط)

## ما أُنجز

### 1. حذف جسور ميتة (مُستبدَلة بجسور مقسّمة)

| ملف محذوف | البديل الحي |
|-----------|-------------|
| `ExecutionDashboardHandlerClusterCoerciveHeavyBridge.tsx` | Ops + Lifecycle + Support + Action + Eviction bridges |
| `ExecutionDashboardHandlerClusterSeizureLogBridge.tsx` | `SeizureLogAssetModalBridge` + `SeizureLogResolutionBridge` |
| `ExecutionDashboardHandlerClusterSeizureRequestsBridge.tsx` | `SeizureHeavyBridge` + `ThirdPartySeizureBridge` |
| `ExecutionDashboardHandlerClusterFollowupOtherPartyCreditorBridge.tsx` | `FollowupOtherPartyBridge` (creditor path) |
| `useExecutionDashboardCoreHandlerClusterCoerciveHeavy.ts` | hooks مقسّمة في coercive/seizure clusters |

`prefetchExecutionHandlerClusterCoerciveHeavyBridge` و `prefetchExecutionHandlerClusterSeizureLogBridge` تبقيان كـ aliases للـ prefetch المقسّم (بدون استيراد الملفات المحذوفة).

### 2. بوابة CI للـ probes

| المكوّن | الدور |
|---------|------|
| `scripts/execution-probes-gate.mjs` | preview على 8090 + تشغيل probes |
| `npm run gate:execution:probes` | بوابة مستقلة للفحص المحلي |
| `execution-production-gate.mjs` | يشغّل probes بعد `build:e2e` قبل E2E |

### 3. إصلاحات regressions مرتبطة

- استيراد `submitBasicSeizurePendingRequest` في `useExecutionDashboardGuarantorFollowupHandlers.ts`
- استيراد `SEIZURE_CLOSE_UNIFIED_LOG_EVENT` في `useExecutionDashboardSeizureAssetModalHandlers.ts`
- `ActionGridSection`: fallback store يفتح المحضر دون toast خطأ زائف
- تحديث اختبارات متأخرة (toast إداري، mocks pipelines chain)

### 4. اختبار هيكلي

`executionDashboardStructure.test.ts` — يتحقق من عدم عودة الجسور المحذوفة ومن استخدام الجسور المقسّمة في `HandlerClusterGroups`.

## التحقق

| الفحص | النتيجة |
|-------|---------|
| Vitest ExecutionDashboard | **722/722** |
| `gate:execution:probes` seizure | **9/9** |
| `gate:execution:probes` followup stubs | **11/11** |
| page errors (probes) | **0** |
| stub warnings (followup probe) | **0** |

## التقييم (المعايير الخمسة)

| البُعد | الدرجة | ملاحظة |
|--------|--------|--------|
| أداء | 9/10 | probes في CI بعد build؛ لا regressions في المسار الحي |
| نظافة | 9/10 | −5 ملفات جسور/هوك ميت؛ prefetch aliases واضحة |
| أمان | 8/10 | لا تغيير صلاحيات؛ إصلاح imports كان عطل runtime |
| جودة كود | 8/10 | تقسيم جسور مؤكد هيكلياً؛ بعض `@ts-nocheck` legacy |
| موبايل | 8/10 | probes تغطي تبويبات المحضر؛ لا تغيير بصري |

## حدود Phase 5

- `guard:dead-modules` و `guard:ts-nocheck` يفشلان بسبب drift خارج نطاق التنفيذ (ملفات home/lawsuits) — لم يُحدَّث baseline في هذه المرحلة.
- `gate:execution` الكامل (E2E Playwright) لم يُشغَّل محلياً في إغلاق هذه المرحلة — probes + unit مغطية.
- مسارات `setShowUnifiedExecutionModal(true)` المباشرة في summons/approval — Phase 3 limit، لم تُغلق هنا.
- `Maximum update depth` عند تبديل تبويبات سريع — لم يُعاد فحصه.

## جاهز للانتقال

**نعم** → Phase 6 (إن وُجد في الخطة) أو متابعة limits المذكورة أعلاه.

## المصداقية

ما لم يُنفَّذ: تحديث baselines الحماية العامة، تشغيل E2E الكامل محلياً، إغلاق كل مسارات فتح المحضر المباشرة.
