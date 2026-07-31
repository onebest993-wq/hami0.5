// @ts-nocheck
/** Phase C Slice 27 — summons profile + persist/save + trash/party edit sync */
import type { ExecutionFile } from '@/app/types/execution';
import { useDebtorSummonsProfile } from '../useDebtorSummonsProfile';
import { useSubsequentNoticeFlow } from '../useSubsequentNoticeFlow';
import { useExecutionDashboardSaveExecutionData } from './useExecutionDashboardSaveExecutionData';
import { useExecutionDashboardExecutorApprovalActions } from './useExecutionDashboardExecutorApprovalActions';
import { useExecutionDashboardPushSeizureAuctionCalendarAppointment } from './useExecutionDashboardPushSeizureAuctionCalendarAppointment';
import { useExecutionDashboardPendingExecutorDecisionOpeners } from './useExecutionDashboardPendingExecutorDecisionOpeners';
import { useExecutionDashboardPersistExecutionMerge } from './useExecutionDashboardPersistExecutionMerge';
import { useExecutionTrashAndPins } from '../useExecutionTrashAndPins';
import { usePartyEditWorkflow } from '../usePartyEditWorkflow';
import {
    useExecutionDashboardExecutionFeeExemptionToast,
    useExecutionDashboardFieldVisitScheduledListener,
    useExecutionDashboardMaritalFurnitureFinancialSync,
} from './useExecutionDashboardRuntimeSyncEffects';
import { useExecutionDashboardStatuteWarning } from './useExecutionDashboardStatuteWarning';
import { useExecutionDashboardTimelineDedupeSync } from './useExecutionDashboardTimelineAndGraceSync';
import {
    useExecutionDashboardGuarantorDecisionSync,
    useExecutionDashboardDeceasedDebtorCoerciveReset,
    useExecutionDashboardSeizureRequestCreatedListener,
    useExecutionDashboardWindowEventListeners,
} from './useExecutionDashboardDecisionAndEventSync';
import type { ExecutionDashboardCorePersistHandlerPipelineInput } from './executionDashboardCorePersistHandlerPipelineInput';


export function useExecutionDashboardCorePersistHandlerPipeline(
    p: ExecutionDashboardCorePersistHandlerPipelineInput,
) {
    const {
        effectiveDebtors,
        financialPrincipalAmount,
        financialLawyerFeesAmount,
        claimType,
        isNonFinancialClaim,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry,
        activeWorkspaceDebtorForFollowup,
        executionData,
        executionId,
        decisionsReloadEpoch,
        isEvictionExecutionModule,
        unifiedCollectionApproved,
        notificationCount,
        forcedAttendanceIssued,
        coercionOrchestrator,
        isEvictionGraceExpiredNow,
        isGracePeriodExpiredNow,
        debtorNotificationDate,
        manualGraceCalendarExtra,
        lawyerStartedPostNoticeExecution,
        noticeVoluntaryPeriodEndOptimistic,
        voluntaryEndOptimistic,
        isEvictionGraceEffectivelyExpired,
        activeCoerciveActions,
        activeDebtorNoticeScope,
        debtorSummonsMarkerLocal,
        monetaryExecutionStrictPathFlag,
        isAlimonyClaim,
        executionExtras,
        unifiedSummonsTargetDebtorKey,
        activeDebtorIsDeceased,
        primaryDebtorKeyResolved,
        debtorNotifiedForEvictionGrace,
        remaining,
        daysSinceNoticeCalculated,
        executionFeeInjected,
        showToast,
        statuteStatus,
        showStatuteWarning,
        setShowStatuteWarning,
        lastActionDate,
        timelineEvents,
        caseNotesLog,
        caseTasksPending,
        financialLedger,
        gracePeriodActive,
        gracePeriodEnded,
        seizedAssets,
        seizureDraftsByDecisionId,
        realEstateSeizureAssets,
        debtorEvaded,
        arrestWarrantUnlocked,
        creditorAttended,
        executionPaused,
        paidDebt,
        paidCourtFees,
        paidDirectorateFees,
        paidClientFees,
        earnerFeeCollectionSm,
        followupOrchestrator,
        file,
        currentFileId,
        isMaritalFurnitureClaim,
        nextTimelineId,
        timelineEventsRef,
        persistExecutionMergeRef,
        pushTimelineEventRef,
        executionFileSnapshotRef,
        setShowDecisionsModal,
        showDecisionsModal,
        setCaseTasksPending,
        setTimelineEvents,
        setExecutionReportPrompt,
        setJudicialCustodianModalCtx,
        setJudicialCustodianModalOpen,
        setCaseNotesLog,
        decisionsStorageExecutionId,
        openBreakInventoryCompletion,
        openJudicialCustodianCompletion,
        isUnifiedTabActive,
        unifiedTabId,
        onUpdate,
        executionDataRef,
        seizureDraftsByDecisionIdRef,
        setExecutionStorageTick,
        showExecutionTrashModal,
        setShowExecutionTrashModal,
        caseNotesLogRef,
        caseTasksPendingRef,
        setPermanentDeleteTimelineId,
        viewExecutionData,
        isHistoricalMode,
        activeSubFileId,
        parentDossierId,
        setSeizureDraftsByDecisionId,
        seizedAssetsSnapshotRef,
        maritalFurnitureItemsForFollowup,
        setActiveCoerciveActions,
        isRepresentingDebtor,
    } = p;

    const debtorSummonsProfileBundle = useDebtorSummonsProfile(
        effectiveDebtors,
        financialPrincipalAmount,
        financialLawyerFeesAmount,
        claimType,
        isNonFinancialClaim,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry ?? activeWorkspaceDebtorForFollowup,
    );

const {
        debtorOccupation,
        isDebtorGovernmentEmployee,
        isDebtorFreelancer,
        isDebtorRetired,
        debtorSummonsProfile,
        followupDebtorSummonsProfile,
        followupIsDebtorGovernmentEmployee,
        followupIsDebtorRetired,
        showSalaryCaptureForEmployee,
    } = debtorSummonsProfileBundle;



    const subsequentNoticeFlow = useSubsequentNoticeFlow(
        executionData,
        executionId,
        decisionsReloadEpoch,
        debtorSummonsProfile,
        followupDebtorSummonsProfile,
        isEvictionExecutionModule,
        isDebtorGovernmentEmployee,
        isDebtorRetired,
        followupIsDebtorGovernmentEmployee,
        followupIsDebtorRetired,
        unifiedCollectionApproved,
        notificationCount,
        forcedAttendanceIssued,
        coercionOrchestrator.summoningRound,
        isEvictionGraceExpiredNow,
        isGracePeriodExpiredNow,
        coercionOrchestrator.debtorAttendedVoluntarily,
        coercionOrchestrator.voluntaryAttendanceCount,
        debtorNotificationDate,
        manualGraceCalendarExtra,
        lawyerStartedPostNoticeExecution,
        noticeVoluntaryPeriodEndOptimistic,
        voluntaryEndOptimistic,
        isEvictionGraceEffectivelyExpired,
        effectiveDebtors,
        activeCoerciveActions,
        coercionOrchestrator.forcedPathAttendanceSecured,
        coercionOrchestrator.debtorForcedToAttend,
        coercionOrchestrator.investigationMemoIssued,
        coercionOrchestrator.debtorArrested,
        activeDebtorNoticeScope,
        debtorSummonsMarkerLocal,
        monetaryExecutionStrictPathFlag,
        isAlimonyClaim,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        executionExtras as unknown as { perDebtorGarnishments?: Record<string, unknown>; [key: string]: unknown },
        unifiedSummonsTargetDebtorKey,
        activeDebtorIsDeceased,
        primaryDebtorKeyResolved,
        debtorNotifiedForEvictionGrace,
        remaining,
    );

const {
        earnerForcedActionUnlocked,
        followupEarnerForcedActionUnlocked,
        baseSubsequentNoticeUnlocked,
        evictionSubsequentNoticeUnlocked,
        subsequentNoticeUnlocked,
        anyExecutorDecisionResolvedForMemoBadge,
        primaryDebtorTaklifActive,
        primaryMemoNoticeBadge,
        primaryDebtorNoticeYmdResolved,
        showDebtorUnservedMemoBadge,
        primaryDebtorAbsenceBadge,
        showDebtorSummonsAttendanceBadge,
        noticeKindGoalStrictBinding,
        employeeAssignmentTabEnabled,
        resolvedEmployeeSummonsAssignment,
        showEmployeeAssignmentCoerciveBlock,
        employeeFinancialSalaryOnlyCoercive,
        monetaryCoerciveLimitedOnly,
        followupEmployeeFinancialSalaryOnlyCoercive,
        followupMonetaryCoerciveLimitedOnly,
        followupGarnishmentAmountPreview,
    } = subsequentNoticeFlow;



    useExecutionDashboardExecutionFeeExemptionToast({
        debtorNotificationDate,
        daysSinceNoticeCalculated,
        remaining,
        executionFeeInjected,
        showToast,
    });

    useExecutionDashboardStatuteWarning(
        statuteStatus,
        showStatuteWarning,
        setShowStatuteWarning,
        isAlimonyClaim,
    );
    
    // ✅ CRITICAL PERFORMANCE FIX: Removed heavy useEffect that was causing 12s+ render time
    // Instead, save data manually when needed (onClose, on specific actions)
    // This prevents infinite re-renders caused by timeline/state updates
    
    // 🚀 OPTIMIZED: Save data only when closing or on specific actions
    const saveExecutionData = useExecutionDashboardSaveExecutionData({
        executionId,
        executionData,
        debtorNotificationDate,
        debtorSummonsMarkerLocal,
        lastActionDate,
        executionFeeInjected,
        timelineEvents,
        caseNotesLog,
        caseTasksPending,
        financialLedger,
        gracePeriodActive,
        gracePeriodEnded,
        seizedAssets,
        seizureDraftsByDecisionId,
        realEstateSeizureAssets,
        activeCoerciveActions,
        notificationCount,
        forcedAttendanceIssued,
        debtorEvaded,
        arrestWarrantUnlocked,
        creditorAttended,
        executionPaused,
        activeNoticeState: coercionOrchestrator.activeNoticeState,
        debtorAttendedVoluntarily: coercionOrchestrator.debtorAttendedVoluntarily,
        debtorForcedToAttend: coercionOrchestrator.debtorForcedToAttend,
        debtorArrested: coercionOrchestrator.debtorArrested,
        nonInterferenceIssued: coercionOrchestrator.nonInterferenceIssued,
        paidDebt,
        paidCourtFees,
        paidDirectorateFees,
        paidClientFees,
        summoningRound: coercionOrchestrator.summoningRound,
        voluntaryAttendanceCount: coercionOrchestrator.voluntaryAttendanceCount,
        investigationCourtRequested: coercionOrchestrator.investigationCourtRequested,
        investigationMemoIssued: coercionOrchestrator.investigationMemoIssued,
        investigationPathDebtorPresent: coercionOrchestrator.investigationPathDebtorPresent,
        forcedPathAttendanceSecured: coercionOrchestrator.forcedPathAttendanceSecured,
        evictionVacateDeadlineLocal: followupOrchestrator.evictionVacateDeadlineLocal,
        evictionResidentialGracePeriodStart: followupOrchestrator.evictionResidentialGracePeriodStart,
        evictionExecutorVacateGrantApproved: followupOrchestrator.evictionExecutorVacateGrantApproved,
        evictionResidentialGraceManuallyEndedAt: followupOrchestrator.evictionResidentialGraceManuallyEndedAt,
        evictionAssetsTabUnlocked: followupOrchestrator.evictionAssetsTabUnlocked,
        evictionCaseExpenses: followupOrchestrator.evictionCaseExpenses,
        encroachmentCaseExpenses: followupOrchestrator.encroachmentCaseExpenses,
        specificDeliveryCaseExpenses: followupOrchestrator.specificDeliveryCaseExpenses,
        earnerFeeCollectionSm,
    });

    const executorApprovalActions = useExecutionDashboardExecutorApprovalActions({
        executionData,
        executionId,
        file,
        currentFileId,
        isMaritalFurnitureClaim,
        nextTimelineId,
        timelineEventsRef,
        persistExecutionMergeRef,
        executionFileSnapshotRef,
        showToast,
        setShowDecisionsModal,
        setShowUnifiedExecutionModal: followupOrchestrator.setShowUnifiedExecutionModal,
        setUnifiedModalTab: followupOrchestrator.setUnifiedModalTab,
        setFollowupExpandProcedureKey: followupOrchestrator.setFollowupExpandProcedureKey,
        setCaseTasksPending,
        setTimelineEvents,
        setExecutionReportPrompt,
        setJudicialCustodianModalCtx,
        setJudicialCustodianModalOpen,
        setCaseNotesLog,
    });

    const pushSeizureAuctionCalendarAppointment =
        useExecutionDashboardPushSeizureAuctionCalendarAppointment(executorApprovalActions);

    const pendingExecutorOpeners = useExecutionDashboardPendingExecutorDecisionOpeners({
            executionId,
            decisionsStorageExecutionId,
            executorApprovalActions,
            setShowDecisionsModal,
            openBreakInventoryCompletion,
            openJudicialCustodianCompletion,
        });

    const { tryOpenPendingBreakInventoryLedger, tryOpenPendingCustodianDetails } =
        pendingExecutorOpeners;

    useExecutionDashboardFieldVisitScheduledListener({
        executionDataId: executionData?.id,
        executionId,
        decisionsStorageExecutionId,
        executorApprovalActions,
    });

    const persistExecutionMergeBinding = useExecutionDashboardPersistExecutionMerge({
        executionId,
        isUnifiedTabActive,
        unifiedTabId,
        onUpdate,
        executionDataRef,
        seizureDraftsByDecisionIdRef,
        setExecutionStorageTick,
        isRepresentingDebtor,
        showToast,
    });

    const { persistExecutionMerge } = persistExecutionMergeBinding;

    persistExecutionMergeRef.current = persistExecutionMerge;
    executionFileSnapshotRef.current = executionData ?? null;

    const trashAndPinsHandlers = useExecutionTrashAndPins({
        showExecutionTrashModal,
        setShowExecutionTrashModal,
        timelineEventsRef,
        caseNotesLogRef,
        caseTasksPendingRef,
        setTimelineEvents,
        setCaseNotesLog,
        setCaseTasksPending,
        persistExecutionMerge,
        showToast,
        currentFileId,
        setPermanentDeleteTimelineId,
    });

    const {
        timelineEditDraft,
        setTimelineEditDraft,
        moveTimelineEventToTrash,
        toggleTimelineEventPin,
        requestEditTimelineEvent,
        restoreTimelineEventFromTrash,
        permanentlyDeleteTimelineEvent,
        moveCaseNoteToTrash,
        moveCaseTaskToTrash,
        toggleCaseNotePin,
        toggleCaseTaskPin,
        saveTimelineEditDraft,
        restoreCaseNoteFromTrash,
        permanentlyDeleteCaseNote,
        restoreCaseTaskFromTrash,
        permanentlyDeleteCaseTask,
    } = trashAndPinsHandlers;

    const partyEditWorkflow = usePartyEditWorkflow({
        executionData,
        viewExecutionData,
        executionDataRef,
        decisionsStorageExecutionId,
        isHistoricalMode,
        persistExecutionMerge,
        showToast,
    });

const {
        editPartyTarget,
        setEditPartyTarget,
        partyEditDraft,
        setPartyEditDraft,
        partyEditHeirDeleteConfirmIdx,
        setPartyEditHeirDeleteConfirmIdx,
        heirsQuickView,
        setHeirsQuickView,
        openEditParty,
        buildPartyHeirsRows,
        openHeirsQuickView,
        savePartyEditDraft,
        removeHeirFromPartyEditDraftAtIndex,
        togglePartyEditHeirClient,
    } = partyEditWorkflow;



    useExecutionDashboardMaritalFurnitureFinancialSync({
        isMaritalFurnitureClaim,
        executionData,
        maritalFurnitureItemsForFollowup,
        persistExecutionMerge,
    });

    useExecutionDashboardTimelineDedupeSync({
        executionData,
        timelineEvents,
        activeSubFileId,
        parentDossierId,
        setTimelineEvents,
        persistExecutionMerge,
    });

    useExecutionDashboardSeizureRequestCreatedListener({
        executionData,
        executionId,
        seizureDraftsByDecisionIdRef,
        seizedAssetsSnapshotRef,
        setSeizureDraftsByDecisionId,
        setTimelineEvents,
        nextTimelineId,
        persistExecutionMerge,
    });

    useExecutionDashboardGuarantorDecisionSync({
        executionData,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        persistExecutionMerge,
    });

    useExecutionDashboardDeceasedDebtorCoerciveReset({
        activeDebtorIsDeceased,
        activeCoerciveActions,
        debtorArrested: coercionOrchestrator.debtorArrested,
        investigationPathDebtorPresent: coercionOrchestrator.investigationPathDebtorPresent,
        executionData,
        setActiveCoerciveActions,
        setDebtorArrested: coercionOrchestrator.setDebtorArrested,
        setInvestigationPathDebtorPresent: coercionOrchestrator.setInvestigationPathDebtorPresent,
        persistExecutionMerge,
    });

    useExecutionDashboardWindowEventListeners({
        executionData,
        executionId,
        decisionsStorageExecutionId,
        setShowDecisionsModal,
        openExecutionSeizuresTab: followupOrchestrator.openExecutionSeizuresTab,
        pushTimelineEventRef,
        nextTimelineId,
        showDecisionsModal,
        showHeirsNotificationModal: followupOrchestrator.showHeirsNotificationModal,
        setShowHeirsNotificationModal: followupOrchestrator.setShowHeirsNotificationModal,
    });

    return { debtorSummonsProfileBundle, debtorOccupation, isDebtorGovernmentEmployee, isDebtorFreelancer, isDebtorRetired, debtorSummonsProfile, followupDebtorSummonsProfile, followupIsDebtorGovernmentEmployee, followupIsDebtorRetired, showSalaryCaptureForEmployee, subsequentNoticeFlow, earnerForcedActionUnlocked, followupEarnerForcedActionUnlocked, baseSubsequentNoticeUnlocked, evictionSubsequentNoticeUnlocked, subsequentNoticeUnlocked, anyExecutorDecisionResolvedForMemoBadge, primaryDebtorTaklifActive, primaryMemoNoticeBadge, primaryDebtorNoticeYmdResolved, showDebtorUnservedMemoBadge, primaryDebtorAbsenceBadge, showDebtorSummonsAttendanceBadge, noticeKindGoalStrictBinding, employeeAssignmentTabEnabled, resolvedEmployeeSummonsAssignment, showEmployeeAssignmentCoerciveBlock, employeeFinancialSalaryOnlyCoercive, monetaryCoerciveLimitedOnly, followupEmployeeFinancialSalaryOnlyCoercive, followupMonetaryCoerciveLimitedOnly, followupGarnishmentAmountPreview, saveExecutionData, executorApprovalActions, pushSeizureAuctionCalendarAppointment, pendingExecutorOpeners, tryOpenPendingBreakInventoryLedger, tryOpenPendingCustodianDetails, persistExecutionMergeBinding, persistExecutionMerge, trashAndPinsHandlers, timelineEditDraft, setTimelineEditDraft, moveTimelineEventToTrash, toggleTimelineEventPin, requestEditTimelineEvent, restoreTimelineEventFromTrash, permanentlyDeleteTimelineEvent, moveCaseNoteToTrash, moveCaseTaskToTrash, toggleCaseNotePin, toggleCaseTaskPin, saveTimelineEditDraft, restoreCaseNoteFromTrash, permanentlyDeleteCaseNote, restoreCaseTaskFromTrash, permanentlyDeleteCaseTask, partyEditWorkflow, editPartyTarget, setEditPartyTarget, partyEditDraft, setPartyEditDraft, partyEditHeirDeleteConfirmIdx, setPartyEditHeirDeleteConfirmIdx, heirsQuickView, setHeirsQuickView, openEditParty, buildPartyHeirsRows, openHeirsQuickView, savePartyEditDraft, removeHeirFromPartyEditDraftAtIndex, togglePartyEditHeirClient };
}
