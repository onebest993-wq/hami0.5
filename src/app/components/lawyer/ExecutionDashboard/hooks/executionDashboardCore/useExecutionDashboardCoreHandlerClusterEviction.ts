// @ts-nocheck
/** Phase B — handler cluster eviction */
import { useMemo, useCallback } from 'react';
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
import type { OpenFollowupModalPersistedFn } from '../../utils/followupModalOpen';

export function useExecutionDashboardCoreHandlerClusterEviction(
    c: ExecutionDashboardCoreHandlerClusterInput,
    deps: HandlerClusterPushTimelineDeps,
) {
    const { pushTimelineEvent } = deps;

    const openFollowupModalPersisted = (c as { openFollowupModalPersisted?: OpenFollowupModalPersistedFn })
        .openFollowupModalPersisted;

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
    } = c as any;

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

    const showResidentialEvictionGraceControl =
        isEvictionExecutionModule && evictionPremisesUseResolved === 'residential';

    const residentialGracePeriodSaved = useMemo(
        () =>
            hasActiveResidentialEvictionGrace({
                premisesUse: evictionPremisesUseResolved,
                gracePeriodStart: evictionResidentialGracePeriodStart,
                vacateDeadline: evictionVacateDeadlineLocal,
                manuallyEndedAt: evictionResidentialGraceManuallyEndedAt,
            }),
        [
            evictionPremisesUseResolved,
            evictionResidentialGracePeriodStart,
            evictionVacateDeadlineLocal,
            evictionResidentialGraceManuallyEndedAt,
        ]
    );

    /** موافقة إنهاء مبكر سارية — تُلغى عند وجود مهلة نشطة (دورة جديدة بعد التسجيل) */
    const residentialGraceEarlyEndApproved = useMemo(() => {
        if (residentialGracePeriodSaved) return false;
        const exId = String(decisionsStorageExecutionId || executionId || '').trim();
        if (!exId) return false;
        const rows = readExecutorDecisionsArray(exId) as Array<Record<string, unknown>>;
        return rows.some((d) => {
            if (String((d as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') {
                return false;
            }
            if (String((d as { evictionWorkflowKey?: string }).evictionWorkflowKey || '') !== 'residential_grace_early_end') {
                return false;
            }
            return isExecutorRowEffectivelyApproved(d);
        });
    }, [
        residentialGracePeriodSaved,
        decisionsStorageExecutionId,
        executionId,
        decisionsReloadEpoch,
    ]);

    /** يظهر طلب الإنهاء فقط مع مهلة سكنية مسجّلة وسارية — نفس شرط «تعديل المهلة» */
    const showResidentialGraceEarlyEndRequest = residentialGracePeriodSaved;

    /** إجراءات ميدانية بعد مهلة سكنية: موافقة إنهاء مبكر، انتهاء تقويمي، أو إنهاء يدوي */
    const residentialGraceAllowsFieldwork = useMemo(() => {
        if (!isEvictionExecutionModule) return true;
        if (evictionPremisesUseResolved !== 'residential') return true;
        if (!residentialGracePeriodSaved) return true;
        if (residentialGraceEarlyEndApproved) return true;
        if (isResidentialVacateGraceFinished) return true;
        if (Boolean((executionData as { eviction_residential_grace_manually_ended_at?: string })?.eviction_residential_grace_manually_ended_at)) {
            return true;
        }
        return false;
    }, [
        isEvictionExecutionModule,
        evictionPremisesUseResolved,
        residentialGracePeriodSaved,
        residentialGraceEarlyEndApproved,
        isResidentialVacateGraceFinished,
        executionData,
    ]);

    const showBreakInventoryRequest = residentialGraceAllowsFieldwork;

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
        setEvictionAssetsTabUnlocked(true);
        persistExecutionMerge({ eviction_assets_tab_unlocked: true });
        openFinancialHubLedger();
        showToast('تم فتح تبويب الحجز المالي', 'success');
    }, [openFinancialHubLedger, persistExecutionMerge, showToast]);

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
