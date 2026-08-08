import type { useExecutionFollowupController } from '../hooks/useExecutionFollowupController';
import type { useExecutionSummonsHub } from '../hooks/useExecutionSummonsHub';

/** State from useExecutionFollowupController (محضر المتابعة + إخلاء) */
export type ExecutionFollowupControllerSlice = ReturnType<typeof useExecutionFollowupController>;

/** State from useExecutionSummonsHub (مركز الاستدعاءات) */
export type ExecutionSummonsHubSlice = ReturnType<typeof useExecutionSummonsHub>;

/**
 * Unified followup orchestrator slice — controller + summons hub.
 * Single source of truth for `workspacePipeline.followupOrchestrator`.
 */
export type ExecutionFollowupOrchestratorSlice = ExecutionFollowupControllerSlice &
    ExecutionSummonsHubSlice;

/** Minimum followup orchestrator surface for followup debtor pipeline */
export type ExecutionFollowupOrchestratorDebtorPipelineSlice = Pick<
    ExecutionFollowupOrchestratorSlice,
    | 'executionDebtorTabIndex'
    | 'setExecutionDebtorTabIndex'
    | 'followupSolidaryDebtorIndex'
    | 'setFollowupSolidaryDebtorIndex'
    | 'summonsContextDebtorKey'
    | 'openExecutionSeizuresTab'
    | 'showHeirsNotificationModal'
    | 'setShowHeirsNotificationModal'
    | 'employeeCompulsoryBannerDismissed'
    | 'setEmployeeCompulsoryBannerDismissed'
    | 'unifiedModalTab'
    | 'setUnifiedModalTab'
    | 'setShowUnifiedExecutionModal'
    | 'followupModalBodyScrollRef'
    | 'followupModalSectionTabsRef'
    | 'followupModalOpenGenerationRef'
    | 'seizureMatrixRef'
    | 'openSeizureRequestsTabRef'
    | 'setEvictionVacateDeadlineLocal'
    | 'setEvictionVacateDraft'
    | 'setEvictionResidentialGracePeriodStart'
    | 'setEvictionResidentialGraceManuallyEndedAt'
    | 'setEvictionExecutorVacateGrantApproved'
    | 'setGraceModalAllowResave'
>;

/** File metadata binding — eviction expenses from followup orchestrator */
export type ExecutionFollowupOrchestratorMetadataSlice = Pick<
    ExecutionFollowupOrchestratorSlice,
    'evictionCaseExpenses'
>;
