/** Grace/master eviction pipeline chain input builder */
import type { AnyRecord, ExecutionDashboardCoreGraceMasterEvictionPipelineInput } from './types';

export function buildExecutionDashboardCoreGraceMasterEvictionPipelineInput(input: {
    executionData: ExecutionDashboardCoreGraceMasterEvictionPipelineInput['executionData'];
    executionId: string | undefined;
    debtors: ExecutionDashboardCoreGraceMasterEvictionPipelineInput['debtors'];
    effectiveDebtors: ExecutionDashboardCoreGraceMasterEvictionPipelineInput['effectiveDebtors'];
    isEvictionExecutionModule: boolean;
    claimType: string;
    isAlimonyClaim: boolean;
    initiator: string;
    totalOwed: number;
    parsedCourtFees: number;
    financialPrincipalAmount: number;
    activeDebtorIsEmployee: boolean;
    followupSpecializationEffective:
        ExecutionDashboardCoreGraceMasterEvictionPipelineInput['followupSpecializationEffective'];
    followupModalSpecialization:
        ExecutionDashboardCoreGraceMasterEvictionPipelineInput['followupModalSpecialization'];
    followupModalSpecializationEffective:
        ExecutionDashboardCoreGraceMasterEvictionPipelineInput['followupModalSpecializationEffective'];
    followupModalDebtorIsEmployee: boolean;
    followupModalDebtorIsDeceased: boolean;
    decisionsReloadEpoch: number;
    isRepresentingDebtor: boolean;
    decisionsStorageExecutionId: string;
    followupSpecialization:
        ExecutionDashboardCoreGraceMasterEvictionPipelineInput['followupSpecialization'];
    showPersonalCoerciveFollowupTab: boolean;
    showGuarantorInSeizureFollowupTab: boolean;
    isPersonalStatusExecutionClaim: boolean;
    isAlimonyClaimType: boolean;
    custodyRemovalClaimActive: boolean;
    employeeCoerciveDetentionRestricted: boolean;
    remainingBalanceForSeizure: number;
    viewExecutionData: ExecutionDashboardCoreGraceMasterEvictionPipelineInput['viewExecutionData'];
    settlementGuarantorGate:
        ExecutionDashboardCoreGraceMasterEvictionPipelineInput['settlementGuarantorGate'];
    activeDebtorIsDeceased: boolean;
    assignmentWorkspaceCtx:
        ExecutionDashboardCoreGraceMasterEvictionPipelineInput['assignmentWorkspaceCtx'];
    primaryDebtorKeyResolved: string;
    personalTabLockedForEmployee: boolean;
    dossierLifecycleRow: ExecutionDashboardCoreGraceMasterEvictionPipelineInput['dossierLifecycleRow'];
    activeDebtorSolidary: ExecutionDashboardCoreGraceMasterEvictionPipelineInput['activeDebtorSolidary'];
    allDebtorsUnified: ExecutionDashboardCoreGraceMasterEvictionPipelineInput['allDebtorsUnified'];
    isHistoricalMode: boolean;
    debtorNotifiedForEvictionGrace: boolean;
    evictionPremisesUseResolved: string;
    workspacePipeline: AnyRecord;
}) {
    const {
        executionData,
        executionId,
        debtors,
        effectiveDebtors,
        isEvictionExecutionModule,
        claimType,
        isAlimonyClaim,
        initiator,
        totalOwed,
        parsedCourtFees,
        financialPrincipalAmount,
        activeDebtorIsEmployee,
        followupSpecializationEffective,
        followupModalSpecialization,
        followupModalSpecializationEffective,
        followupModalDebtorIsEmployee,
        followupModalDebtorIsDeceased,
        decisionsReloadEpoch,
        isRepresentingDebtor,
        decisionsStorageExecutionId,
        followupSpecialization,
        showPersonalCoerciveFollowupTab,
        showGuarantorInSeizureFollowupTab,
        isPersonalStatusExecutionClaim,
        isAlimonyClaimType,
        custodyRemovalClaimActive,
        employeeCoerciveDetentionRestricted,
        remainingBalanceForSeizure,
        viewExecutionData,
        settlementGuarantorGate,
        activeDebtorIsDeceased,
        assignmentWorkspaceCtx,
        primaryDebtorKeyResolved,
        personalTabLockedForEmployee,
        dossierLifecycleRow,
        activeDebtorSolidary,
        allDebtorsUnified,
        isHistoricalMode,
        debtorNotifiedForEvictionGrace,
        evictionPremisesUseResolved,
        workspacePipeline,
    } = input;

    return {
        executionData,
        executionId,
        debtorNotificationDate: workspacePipeline.debtorNotificationDate,
        debtors,
        effectiveDebtors,
        isEvictionExecutionModule,
        notificationCount: workspacePipeline.notificationCount,
        manualGraceCalendarExtra: workspacePipeline.manualGraceCalendarExtra,
        voluntaryEndOptimistic: workspacePipeline.voluntaryEndOptimistic,
        setVoluntaryEndOptimistic: workspacePipeline.setVoluntaryEndOptimistic,
        noticeVoluntaryPeriodEndOptimistic: workspacePipeline.noticeVoluntaryPeriodEndOptimistic,
        setNoticeVoluntaryPeriodEndOptimistic:
            workspacePipeline.setNoticeVoluntaryPeriodEndOptimistic,
        debtorBrowserTabsMode: workspacePipeline.debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry: workspacePipeline.effectiveFollowupDebtorEntry,
        activeWorkspaceDebtorForFollowup: workspacePipeline.activeWorkspaceDebtorForFollowup,
        activeTimelineEventsDebtorScoped: workspacePipeline.activeTimelineEventsDebtorScoped,
        coercionOrchestrator: workspacePipeline.coercionOrchestrator,
        claimType,
        isAlimonyClaim,
        monetaryStrictForSummoningEngine: workspacePipeline.monetaryStrictForSummoningEngine,
        forcedAttendanceIssued: workspacePipeline.forcedAttendanceIssued,
        initiator,
        paidDebt: workspacePipeline.paidDebt,
        totalOwed,
        parsedCourtFees,
        financialPrincipalAmount,
        paidCourtFees: workspacePipeline.paidCourtFees,
        paidDirectorateFees: workspacePipeline.paidDirectorateFees,
        paidClientFees: workspacePipeline.paidClientFees,
        activeDebtorIsEmployee,
        followupSpecializationEffective,
        followupModalSpecialization,
        followupModalSpecializationEffective,
        followupModalDebtorIsEmployee,
        followupModalDebtorIsDeceased,
        decisionsReloadEpoch,
        isRepresentingDebtor,
        decisionsStorageExecutionId,
        followupSpecialization,
        showPersonalCoerciveFollowupTab,
        showGuarantorInSeizureFollowupTab,
        isPersonalStatusExecutionClaim,
        isAlimonyClaimType,
        custodyRemovalClaimActive,
        employeeCoerciveDetentionRestricted,
        remainingBalanceForSeizure,
        viewExecutionData,
        settlementGuarantorGate,
        activeDebtorIsDeceased,
        assignmentWorkspaceCtx,
        primaryDebtorKeyResolved,
        personalTabLockedForEmployee,
        lastActionDate: workspacePipeline.lastActionDate,
        dossierLifecycleRow,
        executionPaused: workspacePipeline.executionPaused,
        isPaused: workspacePipeline.isPaused,
        pauseReason: workspacePipeline.pauseReason,
        executionFeeAdded: workspacePipeline.executionFeeAdded,
        activeDebtorSolidary,
        allDebtorsUnified,
        followupOrchestrator: workspacePipeline.followupOrchestrator,
        isHistoricalMode,
        debtorNotifiedForEvictionGrace,
        evictionPremisesUseResolved,
        todayYmd: workspacePipeline.todayYmd,
        timelineEventsRef: workspacePipeline.timelineEventsRef,
        gracePeriodEnded: workspacePipeline.gracePeriodEnded,
        setGracePeriodEnded: workspacePipeline.setGracePeriodEnded,
        setGracePeriodActive: workspacePipeline.setGracePeriodActive,
        showToastRef: workspacePipeline.showToastRef,
        showToast: workspacePipeline.showToast,
    } as ExecutionDashboardCoreGraceMasterEvictionPipelineInput;
}
