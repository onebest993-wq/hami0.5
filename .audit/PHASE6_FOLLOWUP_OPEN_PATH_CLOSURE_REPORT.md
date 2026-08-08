# Phase 6 — إغلاق مسارات فتح محضر المتابعة المتبقية

**التاريخ:** 2026-08-05  
**الحالة:** مغلقة (النطاق المخطط)

## ما أُنجز

### 1. مساعدات فتح موحّدة (`followupModalOpen.ts`)

| الدالة | الاستخدام |
|--------|-----------|
| `openFollowupCoerciveModal` | تبويب `coercive` + prefetch/persist |
| `setUnifiedModalTab` في legacy fallback | عند غياب المسار الموحّد |

### 2. استبدال `setShowUnifiedExecutionModal(true)` المباشر

| الملف | المسار |
|-------|--------|
| `useExecutionDashboardExecutorApprovalActions` | `openCoerciveFollowup` (موعد/قوة/جرد) |
| `useExecutionDashboardCoerciveActionHandlers` | `openFollowupSeizureRequestsModal` |
| `useExecutionDashboardPoliceAssistanceHandlers` | `openFollowupCoerciveModal` |
| `useExecutionDashboardEvictionResidentialGraceHandlers` | `openFollowupCoerciveModal` |
| `useExecutionDashboardGuarantorFollowupHandlers` | `openFollowupSeizureRequestsModal` |

**المصدر المتبقي الوحيد لـ `setShowUnifiedExecutionModal(true)`:** `useFollowupModalPersistNavigation.openFollowupModalPersisted` (تعريف المسار الموحّد).

### 3. تمرير `openFollowupModalPersisted`

- `buildExecutionDashboardCorePersistHandlerPipelineInput` + claim grace segment
- `useExecutionDashboardCorePersistHandlerPipeline`
- `useExecutionDashboardSaveApprovalCluster`
- handler clusters: eviction, seizure coercive, coercive action

## التحقق

| الفحص | النتيجة |
|-------|---------|
| Vitest ExecutionDashboard | **722/722** |
| followupModalOpen + approval/police/eviction tests | **13/13** |
| `gate:execution:probes` seizure | **9/9** |
| `gate:execution:probes` followup stubs | **11/11** |

## التقييم (المعايير الخمسة)

| البُعد | الدرجة | ملاحظة |
|--------|--------|--------|
| أداء | 9/10 | prefetch overlay قبل فتح المحضر في كل المسارات |
| نظافة | 9/10 | لا فتح مزدوج؛ مسار واحد للقرارات/الحجز/الجبر |
| أمان | 8/10 | لا تغيير صلاحيات |
| جودة كود | 8/10 | helpers موحّدة؛ بعض `@ts-nocheck` legacy |
| موبايل | 8/10 | نفس مسار المحضر الموحّد (persist tab/scroll) |

## حدود Phase 6

- `useExecutionSummonsHub` — مركز الاستدعاءات وليس محضر المتابعة (خارج النطاق)
- `patchExecutorDecisionRow(executionData?.id ?? executionId)` — لم تُراجع
- `Maximum update depth` عند تبديل تبويبات سريع — لم يُعاد فحصه
- `gate:execution` E2E الكامل — لم يُشغَّل محلياً

## جاهز للانتقال

**نعم** — دين التنفيذ المخطط (Phases 2–6) مغلق. متابعة اختيارية: guards عامة، E2E كامل، محرر خلفية الإعدادات.

## المصداقية

ما لم يُنفَّذ: تحديث `guard:dead-modules` / `guard:ts-nocheck` baselines العامة، تحسين أداء محرر wallpaper (طلب منفصل).
