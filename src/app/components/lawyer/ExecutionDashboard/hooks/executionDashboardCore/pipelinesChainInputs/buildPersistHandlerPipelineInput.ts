/** Persist/handler pipeline chain input builder */
import type {
    ExecutionDashboardCorePersistHandlerPipelineInput,
    ExecutionDashboardCoreWorkspacePipelineValue,
    ExecutionDashboardCoreGraceMasterEvictionPipelineValue,
} from './types';

export function buildExecutionDashboardCorePersistHandlerPipelineInput(input: {
    executionData: ExecutionDashboardCorePersistHandlerPipelineInput['executionData'];
    executionId: string | undefined;
    claimType: string;
    isNonFinancialClaim: boolean;
    decisionsReloadEpoch: number;
    isEvictionExecutionModule: boolean;
    monetaryExecutionStrictPathFlag: boolean;
    isAlimonyClaim: boolean;
    executionExtras: ExecutionDashboardCorePersistHandlerPipelineInput['executionExtras'];
    activeDebtorIsDeceased: boolean;
    primaryDebtorKeyResolved: string;
    debtorNotifiedForEvictionGrace: boolean;
    daysSinceNoticeCalculated: number;
    showStatuteWarning: boolean;
    setShowStatuteWarning: (v: boolean) => void;
    statuteStatus: ExecutionDashboardCorePersistHandlerPipelineInput['statuteStatus'];
    file: ExecutionDashboardCorePersistHandlerPipelineInput['file'];
    currentFileId: string;
    isMaritalFurnitureClaim: boolean;
    onUpdate: ExecutionDashboardCorePersistHandlerPipelineInput['onUpdate'];
    isHistoricalMode: boolean;
    activeSubFileId: string | null;
    parentDossierId: string;
    maritalFurnitureItemsForFollowup:
        ExecutionDashboardCorePersistHandlerPipelineInput['maritalFurnitureItemsForFollowup'];
    effectiveDebtors: ExecutionDashboardCorePersistHandlerPipelineInput['effectiveDebtors'];
    financialPrincipalAmount: number;
    financialLawyerFeesAmount: number;
    unifiedCollectionApproved: boolean;
    effectiveFollowupDebtorEntry:
        ExecutionDashboardCorePersistHandlerPipelineInput['effectiveFollowupDebtorEntry'];
    activeWorkspaceDebtorForFollowup:
        ExecutionDashboardCorePersistHandlerPipelineInput['activeWorkspaceDebtorForFollowup'];
    debtorBrowserTabsMode: boolean;
    lawyerStartedPostNoticeExecution: boolean;
    activeDebtorNoticeScope:
        ExecutionDashboardCorePersistHandlerPipelineInput['activeDebtorNoticeScope'];
    debtorSummonsMarkerLocal:
        ExecutionDashboardCorePersistHandlerPipelineInput['debtorSummonsMarkerLocal'];
    unifiedSummonsTargetDebtorKey: string | null;
    setShowDecisionsModal: (show: boolean) => void;
    showDecisionsModal: boolean;
    decisionsStorageExecutionId: string;
    openBreakInventoryCompletion:
        ExecutionDashboardCorePersistHandlerPipelineInput['openBreakInventoryCompletion'];
    openJudicialCustodianCompletion:
        ExecutionDashboardCorePersistHandlerPipelineInput['openJudicialCustodianCompletion'];
    isUnifiedTabActive: boolean;
    unifiedTabId: string;
    executionDataRef: ExecutionDashboardCorePersistHandlerPipelineInput['executionDataRef'];
    setExecutionStorageTick: ExecutionDashboardCorePersistHandlerPipelineInput['setExecutionStorageTick'];
    viewExecutionData: ExecutionDashboardCorePersistHandlerPipelineInput['viewExecutionData'];
    workspacePipeline: ExecutionDashboardCoreWorkspacePipelineValue;
    graceMasterPipeline: ExecutionDashboardCoreGraceMasterEvictionPipelineValue;
    isRepresentingDebtor?: boolean;
    openFollowupModalPersisted?: ExecutionDashboardCorePersistHandlerPipelineInput['openFollowupModalPersisted'];
}) {
    const {
        executionData,
        executionId,
        claimType,
        isNonFinancialClaim,
        decisionsReloadEpoch,
        isEvictionExecutionModule,
        monetaryExecutionStrictPathFlag,
        isAlimonyClaim,
        executionExtras,
        activeDebtorIsDeceased,
        primaryDebtorKeyResolved,
        debtorNotifiedForEvictionGrace,
        daysSinceNoticeCalculated,
        showStatuteWarning,
        setShowStatuteWarning,
        statuteStatus,
        file,
        currentFileId,
        isMaritalFurnitureClaim,
        onUpdate,
        isHistoricalMode,
        activeSubFileId,
        parentDossierId,
        maritalFurnitureItemsForFollowup,
        effectiveDebtors,
        financialPrincipalAmount,
        financialLawyerFeesAmount,
        unifiedCollectionApproved,
        effectiveFollowupDebtorEntry,
        activeWorkspaceDebtorForFollowup,
        workspacePipeline,
        graceMasterPipeline,
    } = input;

    return {
        effectiveDebtors,
        financialPrincipalAmount,
        financialLawyerFeesAmount,
        claimType,
        isNonFinancialClaim,
        debtorBrowserTabsMode: input.debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry,
        activeWorkspaceDebtorForFollowup,
        executionData,
        executionId,
        decisionsReloadEpoch,
        isEvictionExecutionModule,
        unifiedCollectionApproved,
        notificationCount: workspacePipeline.notificationCount,
        forcedAttendanceIssued: workspacePipeline.forcedAttendanceIssued,
        coercionOrchestrator: workspacePipeline.coercionOrchestrator,
        isEvictionGraceExpiredNow: graceMasterPipeline.isEvictionGraceExpiredNow,
        isGracePeriodExpiredNow: graceMasterPipeline.isGracePeriodExpiredNow,
        debtorNotificationDate: workspacePipeline.debtorNotificationDate,
        manualGraceCalendarExtra: workspacePipeline.manualGraceCalendarExtra,
        lawyerStartedPostNoticeExecution: input.lawyerStartedPostNoticeExecution,
        noticeVoluntaryPeriodEndOptimistic: workspacePipeline.noticeVoluntaryPeriodEndOptimistic,
        voluntaryEndOptimistic: workspacePipeline.voluntaryEndOptimistic,
        isEvictionGraceEffectivelyExpired: graceMasterPipeline.isEvictionGraceEffectivelyExpired,
        activeCoerciveActions: workspacePipeline.activeCoerciveActions,
        activeDebtorNoticeScope: input.activeDebtorNoticeScope,
        debtorSummonsMarkerLocal: input.debtorSummonsMarkerLocal,
        monetaryExecutionStrictPathFlag,
        isAlimonyClaim,
        executionExtras,
        unifiedSummonsTargetDebtorKey: input.unifiedSummonsTargetDebtorKey,
        activeDebtorIsDeceased,
        primaryDebtorKeyResolved,
        debtorNotifiedForEvictionGrace,
        remaining: graceMasterPipeline.remaining,
        daysSinceNoticeCalculated,
        executionFeeInjected: workspacePipeline.executionFeeInjected,
        showToast: workspacePipeline.showToast,
        statuteStatus,
        showStatuteWarning,
        setShowStatuteWarning,
        lastActionDate: workspacePipeline.lastActionDate,
        timelineEvents: workspacePipeline.timelineEvents,
        caseNotesLog: workspacePipeline.caseNotesLog,
        caseTasksPending: workspacePipeline.caseTasksPending,
        financialLedger: workspacePipeline.financialLedger,
        gracePeriodActive: workspacePipeline.gracePeriodActive,
        gracePeriodEnded: workspacePipeline.gracePeriodEnded,
        seizedAssets: workspacePipeline.seizedAssets,
        seizureDraftsByDecisionId: workspacePipeline.seizureDraftsByDecisionId,
        realEstateSeizureAssets: workspacePipeline.realEstateSeizureAssets,
        debtorEvaded: workspacePipeline.debtorEvaded,
        arrestWarrantUnlocked: workspacePipeline.arrestWarrantUnlocked,
        creditorAttended: workspacePipeline.creditorAttended,
        executionPaused: workspacePipeline.executionPaused,
        paidDebt: workspacePipeline.paidDebt,
        paidCourtFees: workspacePipeline.paidCourtFees,
        paidDirectorateFees: workspacePipeline.paidDirectorateFees,
        paidClientFees: workspacePipeline.paidClientFees,
        earnerFeeCollectionSm: workspacePipeline.earnerFeeCollectionSm,
        followupOrchestrator: workspacePipeline.followupOrchestrator,
        file,
        currentFileId,
        isMaritalFurnitureClaim,
        nextTimelineId: workspacePipeline.nextTimelineId,
        timelineEventsRef: workspacePipeline.timelineEventsRef,
        persistExecutionMergeRef: workspacePipeline.persistExecutionMergeRef,
        pushTimelineEventRef: workspacePipeline.pushTimelineEventRef,
        executionFileSnapshotRef: workspacePipeline.executionFileSnapshotRef,
        setShowDecisionsModal: input.setShowDecisionsModal,
        showDecisionsModal: input.showDecisionsModal,
        setCaseTasksPending: workspacePipeline.setCaseTasksPending,
        setTimelineEvents: workspacePipeline.setTimelineEvents,
        setExecutionReportPrompt: workspacePipeline.setExecutionReportPrompt,
        setJudicialCustodianModalCtx: workspacePipeline.setJudicialCustodianModalCtx,
        setJudicialCustodianModalOpen: workspacePipeline.setJudicialCustodianModalOpen,
        setCaseNotesLog: workspacePipeline.setCaseNotesLog,
        decisionsStorageExecutionId: input.decisionsStorageExecutionId,
        openBreakInventoryCompletion: input.openBreakInventoryCompletion,
        openJudicialCustodianCompletion: input.openJudicialCustodianCompletion,
        isUnifiedTabActive: input.isUnifiedTabActive,
        unifiedTabId: input.unifiedTabId,
        onUpdate,
        executionDataRef: input.executionDataRef,
        seizureDraftsByDecisionIdRef: workspacePipeline.seizureDraftsByDecisionIdRef,
        setExecutionStorageTick: input.setExecutionStorageTick,
        showExecutionTrashModal: workspacePipeline.showExecutionTrashModal,
        setShowExecutionTrashModal: workspacePipeline.setShowExecutionTrashModal,
        caseNotesLogRef: workspacePipeline.caseNotesLogRef,
        caseTasksPendingRef: workspacePipeline.caseTasksPendingRef,
        setPermanentDeleteTimelineId: workspacePipeline.setPermanentDeleteTimelineId,
        viewExecutionData: input.viewExecutionData,
        isHistoricalMode,
        activeSubFileId,
        parentDossierId,
        setSeizureDraftsByDecisionId: workspacePipeline.setSeizureDraftsByDecisionId,
        seizedAssetsSnapshotRef: workspacePipeline.seizedAssetsSnapshotRef,
        maritalFurnitureItemsForFollowup,
        setActiveCoerciveActions: workspacePipeline.setActiveCoerciveActions,
        isRepresentingDebtor:
            input.isRepresentingDebtor ??
            (workspacePipeline.isRepresentingDebtor as boolean | undefined) ??
            false,
        openFollowupModalPersisted: input.openFollowupModalPersisted,
    } as ExecutionDashboardCorePersistHandlerPipelineInput;
}
