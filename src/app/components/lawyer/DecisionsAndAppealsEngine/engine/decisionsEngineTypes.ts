import type { ExecutionFile, SeizedAsset, TimelineEvent } from '@/app/types/execution';
import type { ExecutorApprovalActions } from '@/app/utils/executorApprovalWorkflow';
import type { Decision } from '../types';

export function normalizeBaseDossierIdFromDecisionsKey(rawKey: string | undefined): string {
    const key = String(rawKey || '').trim();
    if (!key) return '';
    const childIdx = key.indexOf('__child__');
    const subIdx = key.indexOf('__sub__');
    const idx =
        childIdx >= 0 && subIdx >= 0 ? Math.min(childIdx, subIdx) : childIdx >= 0 ? childIdx : subIdx;
    const base = (idx >= 0 ? key.slice(0, idx) : key).trim();
    if (!base || base === 'default' || base === 'undefined' || base === 'null') return '';
    return base;
}

export function dispatchHeirSubstitutionOutcomeIfAny(
    executionId: string | undefined,
    d: { requestKind?: Decision['requestKind']; executorOutcome?: Decision['executorOutcome'] }
) {
    void executionId;
    void d;
}

/** تكامل مركز القرارات مع محضر المتابعة وملف التنفيذ (useDecisionDispatcher) */
export interface DecisionsDispatcherHubProps {
    executionData: ExecutionFile | null;
    seizedAssets: SeizedAsset[];
    seizureDraftsByDecisionId?: Record<string, SeizedAsset>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimeline: (e: TimelineEvent) => void;
    nextTimelineId: () => string;
    syncSeizedAssets?: (assets: SeizedAsset[]) => void;
    syncSeizureDrafts?: (drafts: Record<string, SeizedAsset>) => void;
    syncActiveCoerciveActions?: (actions: string[]) => void;
    /** لقطة إضبارة للسجل عند قرار المنفذ (pushTimeline) */
    getTimelineSnapshot?: () => unknown;
}

export interface DecisionsAndAppealsEngineProps {
    executionId: string | undefined;
    onTimelineUpdate: (event: TimelineEvent) => void;
    dispatcherHub?: DecisionsDispatcherHubProps;
    /**
     * عند التفعيل: بعد «قبول المنفذ» على طلب eviction_procedure يُستدعى handleExecutorApproval
     * (موعد ميداني، مهمة شرطة، أو الانتقال لمحضر التنفيذ).
     */
    evictionExecutorWorkflow?: {
        dossierId: string;
        actions: ExecutorApprovalActions;
    };
    /** عند فتح مركز القرارات من شارة الإضبارة: التبويب الابتدائي */
    bootHubTab?: 'current' | 'previous' | 'appeals' | null;
    /** تمرير لبطاقة القرار في تبويب الطلبات/القرارات */
    decisionsScrollToIdOnBoot?: string | null;
    /** بعد فتح تبويب الطعون: تمرير لبطاقة القرار */
    appealsScrollToIdOnBoot?: string | null;
    /** معاينة لقطة ماضية — تعطيل الإضافة والتعديل على القرارات والطعون */
    isHistoricalMode?: boolean;
    /** لقطات عند إضافة قرار / فتح مسار طعن */
    getMilestoneTimelineSnapshot?: () => unknown;
}
