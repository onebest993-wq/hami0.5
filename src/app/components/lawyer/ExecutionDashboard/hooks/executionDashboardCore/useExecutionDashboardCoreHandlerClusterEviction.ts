/** Phase B — handler cluster eviction */
import { useCallback } from 'react';
import { useExecutionDashboardGracePeriodEndHandler } from './useExecutionDashboardGracePeriodEndHandler';
import { useExecutionDashboardEvictionHeirsMemoHandlers } from './useExecutionDashboardEvictionHeirsMemoHandlers';
import { useExecutionDashboardEvictionResidentialGraceHandlers } from './useExecutionDashboardEvictionResidentialGraceHandlers';
import { useExecutionDashboardPoliceAssistanceHandlers } from './useExecutionDashboardPoliceAssistanceHandlers';
import { useExecutionDashboardBreakInventoryHandlers } from './useExecutionDashboardBreakInventoryHandlers';
import { useExecutionDashboardGuarantorFollowupHandlers } from './useExecutionDashboardGuarantorFollowupHandlers';
import { useExecutionDashboardEvictionFinancialHandlers } from './useExecutionDashboardEvictionFinancialHandlers';
import { useExecutionDashboardModuleExpenseHandlers } from './useExecutionDashboardModuleExpenseHandlers';
import { useEvictionLawyerFeeOutcome } from '../useEvictionLawyerFeeOutcome';
import { useEvictionProcedures } from '../useEvictionProcedures';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import type { HandlerClusterPushTimelineDeps } from './executionDashboardCoreHandlerClusterTypes';
import { useResidentialEvictionGraceFlags } from './useResidentialEvictionGraceFlags';
import { toastAfterExecutionPersist } from '../../helpers/toastAfterExecutionPersist';

export function useExecutionDashboardCoreHandlerClusterEviction(
    c: ExecutionDashboardCoreHandlerClusterInput,
    deps: HandlerClusterPushTimelineDeps,
) {
    const { pushTimelineEvent } = deps;

    const { openFollowupModalPersisted } = c;

    const {
        EVICTION_WORKFLOW_BY_ACTION_ID,
        appendEvictionExecutorRequest,
        assignmentWorkspaceCtx,
        calculatedExecutionFee,
        caseTasksPendingRef,
        currentFileId,
        debtorNotificationDate,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        encroachmentCaseExpenses,
        evictionCaseExpenses,
        evictionExpenseAmount,
        evictionExpenseNote,
        evictionExpensePayMode,
        evictionGraceDecisionId,
        evictionHeirsNotificationDateYmd,
        evictionPremisesUseResolved,
        evictionProcedureLocked,
        evictionResidentialGraceManuallyEndedAt,
        evictionResidentialGracePeriodStart,
        evictionVacateDeadlineLocal,
        evictionVacateDraft,
        evictionWorkflowKey,
        eviction_assets_tab_unlocked,
        eviction_procedure,
        eviction_residential_grace_manually_ended_at,
        executionData,
        executionDataId,
        executionDataRef,
        executionFeeInjected,
        executionId,
        executorApprovalActions,
        file,
        graceModalAllowResave,
        graceModalEndYmd,
        graceModalStartYmd,
        gracePeriodStart,
        guarantorDetailsDecisionId,
        hasActiveResidentialEvictionGrace,
        isEvictionExecutionModule,
        isExecutorRowEffectivelyApproved,
        isResidentialVacateGraceFinished,
        lawyerFeeDisburseMode,
        lawyerFeeDisburseNotes,
        manuallyEndedAt,
        nextTimelineId,
        openBreakInventoryCompletion,
        openEvictionExecutorCompletionRef,
        openFinancialHubLedger,
        openGuarantorDetailsModal,
        openJudicialCustodianCompletion,
        openSeizureRequestsTabRef,
        parsedLawyerFees,
        persistExecutionMerge,
        persistExecutionMergeRef,
        policeAssistanceDecisionId,
        premisesUse,
        readExecutorDecisionsArray,
        residentialVacateDeadlineMaxIso,
        residential_grace_early_end,
        setCaseNotesLog,
        setCaseTasksPending,
        setDebtorNotificationDate,
        setDecisionsModalBootListTab,
        setDecisionsModalScrollToDecisionId,
        setEncroachmentCaseExpenses,
        setEvictionAssetsTabUnlocked,
        setEvictionCaseExpenses,
        setEvictionExecutorVacateGrantApproved,
        setEvictionExpenseAmount,
        setEvictionExpenseNote,
        setEvictionExpensePayMode,
        setEvictionGraceDecisionId,
        setEvictionHeirsNotificationDateYmd,
        setEvictionResidentialGraceManuallyEndedAt,
        setEvictionResidentialGracePeriodStart,
        setEvictionVacateDeadlineLocal,
        setEvictionVacateDraft,
        setExecutionFeeInjected,
        setFollowupExpandProcedureKey,
        setGraceModalAllowResave,
        setGraceModalEndYmd,
        setGraceModalStartYmd,
        setGracePeriodActive,
        setGracePeriodEnded,
        setGuarantorDetailsDecisionId,
        setLastActionDate,
        setLawyerFeeDisburseNotes,
        setPoliceAssistanceAgencyDraft,
        setPoliceAssistanceDecisionId,
        setPoliceAssistanceModalOpen,
        setPoliceAssistanceRequestTitle,
        setSeizedAssets,
        setSeizureDetailCompletion,
        setShowCoerciveActionForm,
        setShowDecisionsModal,
        setShowEvictionExpenseModal,
        setShowEvictionLawyerFeeModal,
        setShowEvictionResidentialGraceModal,
        setShowUnifiedExecutionModal,
        setSpecificDeliveryCaseExpenses,
        setTimelineEvents,
        setUnifiedModalTab,
        showToast,
        specificDeliveryCaseExpenses,
        timelineEvents,
        timelineEventsRef,
        vacateDeadline,
    } = c as Record<string, unknown>;

    const gracePeriodEndHandler = useExecutionDashboardGracePeriodEndHandler({
        debtorNotificationDate,
        executionFeeInjected,
        calculatedExecutionFee,
        pushTimelineEvent,
        showToast,
        setGracePeriodActive,
        setGracePeriodEnded,
        setDebtorNotificationDate,
        setExecutionFeeInjected,
        setLastActionDate,
    });

    const { handleEndGracePeriod } = gracePeriodEndHandler;

    const evictionProceduresHandlers = useEvictionProcedures(
        evictionProcedureLocked,
        decisionsStorageExecutionId,
        EVICTION_WORKFLOW_BY_ACTION_ID,
        appendEvictionExecutorRequest,
        showToast,
        executionData as Record<string, unknown> | null | undefined,
    );

    const { appendEvictionProcedure } = evictionProceduresHandlers;

    const evictionHeirsMemoHandlers = useExecutionDashboardEvictionHeirsMemoHandlers({
        evictionHeirsNotificationDateYmd,
        setEvictionHeirsNotificationDateYmd,
        persistExecutionMerge,
        appendEvictionProcedure,
    });

    const {
        handleEvictionHeirsNotificationDateChange,
        handleIssueHeirsExecutionNoticeMemo,
    } = evictionHeirsMemoHandlers;

    const {
        showResidentialEvictionGraceControl,
        residentialGracePeriodSaved,
        residentialGraceEarlyEndApproved,
        showResidentialGraceEarlyEndRequest,
        residentialGraceAllowsFieldwork,
        showBreakInventoryRequest,
    } = useResidentialEvictionGraceFlags({
        isEvictionExecutionModule,
        evictionPremisesUseResolved,
        evictionResidentialGracePeriodStart,
        evictionVacateDeadlineLocal,
        evictionResidentialGraceManuallyEndedAt,
        decisionsStorageExecutionId,
        executionId,
        decisionsReloadEpoch,
        isResidentialVacateGraceFinished,
        executionData,
        hasActiveResidentialEvictionGrace,
        readExecutorDecisionsArray,
        isExecutorRowEffectivelyApproved,
    });

    const evictionResidentialGraceHandlers = useExecutionDashboardEvictionResidentialGraceHandlers({
        graceModalAllowResave,
        residentialGracePeriodSaved,
        evictionProcedureLocked,
        evictionVacateDeadlineLocal,
        evictionVacateDraft,
        evictionResidentialGracePeriodStart,
        graceModalStartYmd,
        graceModalEndYmd,
        isResidentialVacateGraceFinished,
        residentialVacateDeadlineMaxIso,
        timelineEvents,
        timelineEventsRef,
        caseTasksPendingRef,
        decisionsStorageExecutionId,
        executionId,
        executionData,
        file,
        currentFileId,
        evictionGraceDecisionId,
        executorApprovalActions,
        openBreakInventoryCompletion,
        openJudicialCustodianCompletion,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setGraceModalEndYmd,
        setGraceModalStartYmd,
        setGraceModalAllowResave,
        setShowEvictionResidentialGraceModal,
        setEvictionGraceDecisionId,
        setEvictionVacateDeadlineLocal,
        setEvictionVacateDraft,
        setEvictionResidentialGracePeriodStart,
        setEvictionExecutorVacateGrantApproved,
        setEvictionResidentialGraceManuallyEndedAt,
        setTimelineEvents,
        setCaseTasksPending,
        setShowDecisionsModal,
        setDecisionsModalBootListTab,
        setDecisionsModalScrollToDecisionId,
        setPoliceAssistanceDecisionId,
        setPoliceAssistanceRequestTitle,
        setPoliceAssistanceAgencyDraft,
        setPoliceAssistanceModalOpen,
        openFollowupModalPersisted,
        setShowUnifiedExecutionModal,
        setUnifiedModalTab,
    });

const {
        residentialGraceModalShowPrimarySave,
        openEvictionResidentialGraceModal,
        openEvictionExecutorCompletion,
        submitEvictionResidentialGraceFromModal,
        completeEvictionResidentialGrace,
    } = evictionResidentialGraceHandlers;



    openEvictionExecutorCompletionRef.current = openEvictionExecutorCompletion;

    const policeAssistanceHandlers = useExecutionDashboardPoliceAssistanceHandlers({
        evictionProcedureLocked,
        decisionsStorageExecutionId,
        executionData,
        executionId,
        executorApprovalActions,
        timelineEventsRef,
        caseTasksPendingRef,
        policeAssistanceDecisionId,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setCaseTasksPending,
        setTimelineEvents,
        setPoliceAssistanceDecisionId,
        setPoliceAssistanceRequestTitle,
        setPoliceAssistanceAgencyDraft,
        setPoliceAssistanceModalOpen,
        executionDataRef,
        setShowDecisionsModal,
        openFollowupModalPersisted,
        setShowUnifiedExecutionModal,
        setUnifiedModalTab,
        setFollowupExpandProcedureKey,
    });

const {
        openPoliceAssistanceFromBadge,
        openPoliceAssistanceDetailsForDecision,
        savePoliceAssistanceEntry,
        savePoliceAssistanceFromModal,
        completePoliceAssistance,
    } = policeAssistanceHandlers;



    const breakInventoryHandlers = useExecutionDashboardBreakInventoryHandlers({
        evictionProcedureLocked,
        decisionsStorageExecutionId,
        executionData,
        executionId,
        showToast,
        setCaseNotesLog,
        persistExecutionMergeRef,
        persistExecutionMerge,
    });

const {
        saveBreakInventoryLedgerEntry,
        finalizeBreakInventoryEntry,
        saveMaritalFurnitureDeliveryInventoryEntry,
    } = breakInventoryHandlers;



    const guarantorFollowupHandlers = useExecutionDashboardGuarantorFollowupHandlers({
        decisionsStorageExecutionId,
        executionData,
        executionId,
        assignmentWorkspaceCtx,
        nextTimelineId,
        pushTimelineEvent,
        persistExecutionMerge,
        showToast,
        openGuarantorDetailsModal,
        openSeizureRequestsTabRef,
        setTimelineEvents,
        setShowCoerciveActionForm,
        setSeizureDetailCompletion,
        openFollowupModalPersisted,
        setShowUnifiedExecutionModal,
        setUnifiedModalTab,
        executionDataRef,
        persistExecutionMergeRef,
        guarantorDetailsDecisionId,
        setGuarantorDetailsDecisionId,
    });

const {
        requestFollowupSeizureDecision,
        handleGuarantorRequestFromFollowup,
        archiveAndClearGuarantor,
        requestGuarantorSeizure,
        persistGuarantorFollowupDetails,
    } = guarantorFollowupHandlers;



    const handleEvictionUnlockAssetsTab = useCallback(() => {
        const persisted = persistExecutionMerge({ eviction_assets_tab_unlocked: true });
        if (
            !toastAfterExecutionPersist(
                persisted,
                showToast,
                'تم فتح تبويب الحجز المالي',
            )
        ) {
            return;
        }
        setEvictionAssetsTabUnlocked(true);
        openFinancialHubLedger();
    }, [openFinancialHubLedger, persistExecutionMerge, setEvictionAssetsTabUnlocked, showToast]);

    const evictionFinancialHandlers = useExecutionDashboardEvictionFinancialHandlers({
        decisionsStorageExecutionId,
        parsedLawyerFees,
        lawyerFeeDisburseMode,
        lawyerFeeDisburseNotes,
        evictionExpenseAmount,
        evictionExpenseNote,
        evictionExpensePayMode,
        evictionCaseExpenses,
        timelineEvents,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setEvictionAssetsTabUnlocked,
        setTimelineEvents,
        setEvictionCaseExpenses,
        setShowEvictionLawyerFeeModal,
        setLawyerFeeDisburseNotes,
        setShowEvictionExpenseModal,
        setEvictionExpenseAmount,
        setEvictionExpenseNote,
        setEvictionExpensePayMode,
    });

const {
        handleEvictionLedgerActivated,
        handleEvictionLawyerFeeRequest,
        runEvictionLawyerFeeSubmit,
        runEvictionExpenseSubmit,
    } = evictionFinancialHandlers;



    const moduleExpenseHandlers = useExecutionDashboardModuleExpenseHandlers({
        executionData,
        encroachmentCaseExpenses,
        specificDeliveryCaseExpenses,
        timelineEvents,
        nextTimelineId,
        persistExecutionMerge,
        setEncroachmentCaseExpenses,
        setSpecificDeliveryCaseExpenses,
        setTimelineEvents,
    });

const {
        handleEncroachmentExpenseRecorded,
        handleSpecificDeliveryExpenseRecorded,
        handleSpecificDeliveryFinancialized,
        handleSpecificDeliveryItemDeclaredDestroyed,
    } = moduleExpenseHandlers;



    useEvictionLawyerFeeOutcome({
        executionDataId: executionData?.id,
        executionId,
        decisionsStorageExecutionId,
        parsedLawyerFees,
        evictionCaseExpenses,
        setEvictionAssetsTabUnlocked,
        setSeizedAssets,
        persistExecutionMerge,
        showToast,
    });
    return {
        gracePeriodEndHandler,
        evictionProceduresHandlers,
        evictionHeirsMemoHandlers,
        showResidentialEvictionGraceControl,
        residentialGracePeriodSaved,
        showResidentialGraceEarlyEndRequest,
        residentialGraceAllowsFieldwork,
        showBreakInventoryRequest,
        evictionResidentialGraceHandlers,
        policeAssistanceHandlers,
        breakInventoryHandlers,
        guarantorFollowupHandlers,
        evictionFinancialHandlers,
        moduleExpenseHandlers,
    };
}
