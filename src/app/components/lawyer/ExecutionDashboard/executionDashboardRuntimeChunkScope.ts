// @ts-nocheck
/** مرافق تنفيذ ثقيلة — chunk execution-helpers */
import {
    getExecutionModuleStrategy,
    isEvictionClaim,
    isEncroachmentRemovalClaim,
    isSpecificDeliveryClaim,
    getResidentialVacateDeadlineMaxIso,
    isVacateDeadlinePassed,
    hasEvictionTimelineAction,
    EVICTION_TIMELINE_ACTION_IDS,
} from '@/app/utils/executionModuleStrategies';
import {
    HAMI_RESIDENTIAL_GRACE_CLEARED,
    hasActiveResidentialEvictionGrace,
} from '@/app/utils/residentialEvictionGrace';
import {
    EVICTION_WORKFLOW_BY_ACTION_ID,
    fieldVisitAppointmentStorageKey,
    handleExecutorApproval,
    inferExecutorApprovalDecisionType,
    openBreakInventoryCompletion,
    openJudicialCustodianCompletion,
    type BreakInventoryFurnitureSavePayload,
    type ExecutorApprovalActions,
    type JudicialCustodianSavePayload,
    type ScheduledDateSavePayload,
} from '@/app/utils/executorApprovalWorkflow';
import {
    buildPublicationNoticePatchForDebtorKey,
    getPublicationNoticeForDebtorKey,
    publicationNoticeDeadlineYmd,
    PUBLICATION_NOTICE_DURATION_DAYS,
} from '@/app/utils/publicationNoticeDebtor';
import { normalizeDateToYmd } from '@/app/services/calendarBridge';

export const EXECUTION_DASHBOARD_RUNTIME_CHUNK_SCOPE = {
    EVICTION_TIMELINE_ACTION_IDS,
    EVICTION_WORKFLOW_BY_ACTION_ID,
    HAMI_RESIDENTIAL_GRACE_CLEARED,
    PUBLICATION_NOTICE_DURATION_DAYS,
    buildPublicationNoticePatchForDebtorKey,
    fieldVisitAppointmentStorageKey,
    getExecutionModuleStrategy,
    getPublicationNoticeForDebtorKey,
    getResidentialVacateDeadlineMaxIso,
    handleExecutorApproval,
    hasActiveResidentialEvictionGrace,
    hasEvictionTimelineAction,
    inferExecutorApprovalDecisionType,
    isEncroachmentRemovalClaim,
    isEvictionClaim,
    isSpecificDeliveryClaim,
    isVacateDeadlinePassed,
    normalizeDateToYmd,
    openBreakInventoryCompletion,
    openJudicialCustodianCompletion,
    publicationNoticeDeadlineYmd,
} as const;

export type {
    BreakInventoryFurnitureSavePayload,
    ExecutorApprovalActions,
    JudicialCustodianSavePayload,
    ScheduledDateSavePayload,
};

export function spreadExecutionDashboardRuntimeChunkScope(): Record<string, unknown> {
    return EXECUTION_DASHBOARD_RUNTIME_CHUNK_SCOPE as unknown as Record<string, unknown>;
}
