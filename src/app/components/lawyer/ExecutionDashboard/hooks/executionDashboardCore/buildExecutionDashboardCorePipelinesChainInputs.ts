/** Phase C Slice 33 ظ¤ builders for workspace/followup/claim/grace/persist chain inputs */
import type { UseExecutionDashboardClaimFinancialsParams } from './useExecutionDashboardClaimFinancials';

/** Input shape for useExecutionDashboardCoreFollowupDebtorPipeline (exported locally ظ¤ hook file is @ts-nocheck). */
export type ExecutionDashboardCoreFollowupDebtorPipelineInput = Parameters<
    typeof import('./useExecutionDashboardCoreFollowupDebtorPipeline').useExecutionDashboardCoreFollowupDebtorPipeline
>[0];

import type { ExecutionDashboardCoreClaimFinancialLedgerPipelineInput } from './useExecutionDashboardCoreClaimFinancialLedgerPipeline';
import type { ExecutionDashboardCoreGraceMasterEvictionPipelineInput } from './executionDashboardCoreGraceMasterEvictionPipelineInput';
import type { ExecutionDashboardCorePersistHandlerPipelineInput } from './executionDashboardCorePersistHandlerPipelineInput';

type AnyRecord = Record<string, any>;

export function buildExecutionDashboardCoreWorkspacePipelineInput(input: {
    boot: AnyRecord;
    executionId: string | undefined;
}) {
    const { boot, executionId } = input;

    return {
        modals: boot.modals,
        executionData: boot.executionData,
        executionDataRef: boot.executionDataRef,
        executionFileKey: boot.executionFileKey,
        executionDashboardFileId: boot.executionDashboardFileId,
        executionId,
        decisionsStorageExecutionId: boot.decisionsStorageExecutionId,
        executionStorageTick: boot.executionStorageTick,
        setExecutionModal: boot.setExecutionModal,
        showDecisionsModal: boot.showDecisionsModal,
        setShowDecisionsModal: boot.setShowDecisionsModal,
        setShowNotesModal: boot.setShowNotesModal,
        setShowDocumentsModal: boot.setShowDocumentsModal,
        setShowAppointmentModal: boot.setShowAppointmentModal,
        setShowTimelineModal: boot.setShowTimelineModal,
        setShowNotificationModal: boot.setShowNotificationModal,
        setShowCoerciveModal: boot.setShowCoerciveModal,
        subFiles: boot.subFiles,
        activeSubFileId: boot.activeSubFileId,
        isInabaActive: boot.isInabaActive,
        parentDossierId: boot.parentDossierId,
    };
}

export function buildExecutionDashboardCoreFollowupDebtorPipelineInput(input: {
    executionData: ExecutionDashboardCoreFollowupDebtorPipelineInput['executionData'];
    viewExecutionData: ExecutionDashboardCoreFollowupDebtorPipelineInput['viewExecutionData'];
    executionId: string | undefined;
    decisionsStorageExecutionId: string;
    decisionsReloadEpoch: number;
    claimType: string;
    creditors: ExecutionDashboardCoreFollowupDebtorPipelineInput['creditors'];
    debtors: ExecutionDashboardCoreFollowupDebtorPipelineInput['debtors'];
    showToast: (msg: string, type?: string) => void;
    dossierFileKey: string;
    executionFileKey: string;
    setShowDecisionsModal: (show: boolean) => void;
    showDecisionsModal: boolean;
    setShowExtraCreditors: (show: boolean) => void;
    setShowExtraDebtors: (show: boolean) => void;
    setDebtorSummonsMarkerLocal:
        ExecutionDashboardCoreFollowupDebtorPipelineInput['setDebtorSummonsMarkerLocal'];
    workspacePipeline: AnyRecord;
}) {
    const {
        executionData,
        viewExecutionData,
        executionId,
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        claimType,
        creditors,
        debtors,
        showToast,
        dossierFileKey,
        executionFileKey,
        setShowDecisionsModal,
        showDecisionsModal,
        setShowExtraCreditors,
        setShowExtraDebtors,
        setDebtorSummonsMarkerLocal,
        workspacePipeline,
    } = input;

    return {
        executionData,
        viewExecutionData,
        executionId,
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        claimType,
        creditors,
        debtors,
        mergedTimelineEvents: workspacePipeline.mergedTimelineEvents,
        activeTimelineEvents: workspacePipeline.activeTimelineEvents,
        activeCoerciveActions: workspacePipeline.activeCoerciveActions,
        realEstateSeizureRegistryAssets: workspacePipeline.realEstateSeizureRegistryAssets,
        salarySeizureRegistryAssets: workspacePipeline.salarySeizureRegistryAssets,
        movableSeizureRegistryAssets: workspacePipeline.movableSeizureRegistryAssets,
        thirdPartySeizureRegistryAssets: workspacePipeline.thirdPartySeizureRegistryAssets,
        thirdPartySeizuresUi: workspacePipeline.thirdPartySeizuresUi,
        showToast,
        showUnifiedExecutionModal: workspacePipeline.showUnifiedExecutionModal,
        dossierFileKey,
        executionFileKey,
        setShowDecisionsModal,
        showDecisionsModal,
        setActiveTimelineFilter: workspacePipeline.setActiveTimelineFilter,
        setShowExtraCreditors,
        setShowExtraDebtors,
        caseTasksPendingRef: workspacePipeline.caseTasksPendingRef,
        setCaseTasksPending: workspacePipeline.setCaseTasksPending,
        setTimelineEvents: workspacePipeline.setTimelineEvents,
        persistExecutionMergeRef: workspacePipeline.persistExecutionMergeRef,
        setNotificationCount: workspacePipeline.setNotificationCount,
        setDebtorSummonsMarkerLocal,
        pushTimelineEventRef: workspacePipeline.pushTimelineEventRef,
        nextTimelineId: workspacePipeline.nextTimelineId,
        followupOrchestrator: workspacePipeline.followupOrchestrator,
    };
}

export function buildExecutionDashboardCoreClaimFinancialLedgerPipelineInput(input: {
    executionData: ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['executionData'];
    viewExecutionData: ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['viewExecutionData'];
    executionId: string | undefined;
    claimType: string;
    totalAmount: number;
    debtAmount: ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['debtAmount'];
    lawyerFeesAmount: ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['lawyerFeesAmount'];
    executionFee: ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['executionFee'];
    clientFeesAmount: ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['clientFeesAmount'];
    courtFees: ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['courtFees'];
    directorateFees: ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['directorateFees'];
    evictionCaseExpensesSum: number;
    liabilityGroupTabsMode: boolean;
    activeLiabilityGroup: UseExecutionDashboardClaimFinancialsParams['activeLiabilityGroup'];
    allDebtorRowsForLiability: UseExecutionDashboardClaimFinancialsParams['allDebtorRowsForLiability'];
    decisionsStorageExecutionId: string;
    executionFileKey: string;
    decisionsReloadEpoch: number;
    showToast: (msg: string, type?: string) => void;
    docType: string;
    classification: string;
    activeDebtorEntityKind: string | null | undefined;
    followupSpecialization: AnyRecord;
    followupSectionTabOrder: unknown;
    followupModalTabs: unknown;
    followupTabsRestricted: boolean;
    restrictedFollowupTabIds: unknown;
    hideFollowupCoerciveTab: boolean;
    hideCoerciveTabsForDebtorAgent: boolean;
    showPersonalCoerciveFollowupTab: boolean;
    isSolidaryLiability: boolean;
    allDebtorsUnified: unknown[];
    activeDebtorIsEmployee: boolean;
    activeDebtorIsDeceased: boolean;
    activeWorkspaceDebtorForFollowup: unknown;
    workspacePipeline: AnyRecord;
}) {
    const {
        executionData,
        viewExecutionData,
        executionId,
        claimType,
        totalAmount,
        debtAmount,
        lawyerFeesAmount,
        executionFee,
        clientFeesAmount,
        courtFees,
        directorateFees,
        evictionCaseExpensesSum,
        liabilityGroupTabsMode,
        activeLiabilityGroup,
        allDebtorRowsForLiability,
        decisionsStorageExecutionId,
        executionFileKey,
        decisionsReloadEpoch,
        showToast,
        docType,
        classification,
        activeDebtorEntityKind,
        followupSpecialization,
        followupSectionTabOrder,
        followupModalTabs,
        followupTabsRestricted,
        restrictedFollowupTabIds,
        hideFollowupCoerciveTab,
        hideCoerciveTabsForDebtorAgent,
        showPersonalCoerciveFollowupTab,
        isSolidaryLiability,
        allDebtorsUnified,
        activeDebtorIsEmployee,
        activeDebtorIsDeceased,
        activeWorkspaceDebtorForFollowup,
        workspacePipeline,
    } = input;

    return {
        executionData,
        viewExecutionData,
        executionId,
        claimType,
        totalAmount,
        debtAmount,
        lawyerFeesAmount,
        executionFee,
        clientFeesAmount,
        courtFees,
        directorateFees,
        evictionCaseExpensesSum,
        liabilityGroupTabsMode,
        activeLiabilityGroup,
        allDebtorRowsForLiability,
        activeTimelineEvents: workspacePipeline.activeTimelineEvents,
        decisionsStorageExecutionId,
        debtorNotificationDate: workspacePipeline.debtorNotificationDate,
        effectiveDebtors: workspacePipeline.effectiveDebtors,
        executionFileKey,
        decisionsReloadEpoch,
        persistExecutionMergeRef: workspacePipeline.persistExecutionMergeRef,
        executionDataRef: workspacePipeline.executionDataRef,
        setThirdPartySeizuresUi: workspacePipeline.setThirdPartySeizuresUi,
        clearThirdPartyFundsDraft: workspacePipeline.clearThirdPartyFundsDraft,
        setTimelineEvents: workspacePipeline.setTimelineEvents,
        nextTimelineId: workspacePipeline.nextTimelineId,
        showToast,
        applyThirdPartySeizuresFromPatch: workspacePipeline.applyThirdPartySeizuresFromPatch,
        pushTimelineEventRef: workspacePipeline.pushTimelineEventRef,
        focusSeizurePropertyInlineRef: workspacePipeline.focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef: workspacePipeline.focusSeizureMovableInlineRef,
        focusSeizureThirdPartyInlineRef: workspacePipeline.focusSeizureThirdPartyInlineRef,
        focusSeizureNoticeInlineRef: workspacePipeline.focusSeizureNoticeInlineRef,
        openSeizureRequestsTabRef: workspacePipeline.followupOrchestrator.openSeizureRequestsTabRef,
        setShowCoerciveActionForm: workspacePipeline.setShowCoerciveActionForm,
        setSeizureDetailCompletion: workspacePipeline.setSeizureDetailCompletion,
        setShowUnifiedExecutionModal: workspacePipeline.followupOrchestrator.setShowUnifiedExecutionModal,
        setEvictionAssetsTabUnlocked: workspacePipeline.followupOrchestrator.setEvictionAssetsTabUnlocked,
        seizedAssetsSnapshotRef: workspacePipeline.seizedAssetsSnapshotRef,
        setSeizedAssets: workspacePipeline.setSeizedAssets,
        setFinancialHubAutoOpenMode: workspacePipeline.setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId: workspacePipeline.setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId: workspacePipeline.setFinancialHubSeizedPropertyId,
        openFinancialHubLedger: workspacePipeline.openFinancialHubLedger,
        debtorBrowserTabsMode: workspacePipeline.debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        activeDebtorIsEmployee,
        docType,
        classification,
        activeDebtorEntityKind,
        activeDebtorIsDeceased,
        followupSpecialization,
        followupSectionTabOrder,
        followupModalTabs,
        followupTabsRestricted,
        restrictedFollowupTabIds,
        setUnifiedModalTab: workspacePipeline.followupOrchestrator.setUnifiedModalTab,
        showUnifiedExecutionModal: workspacePipeline.showUnifiedExecutionModal,
        unifiedModalTab: workspacePipeline.followupOrchestrator.unifiedModalTab,
        hideFollowupCoerciveTab,
        hideCoerciveTabsForDebtorAgent,
        showPersonalCoerciveFollowupTab,
        setShowSolidaryCoerciveTargetModal:
            workspacePipeline.followupOrchestrator.setShowSolidaryCoerciveTargetModal,
        setSolidaryCoerciveActionPending:
            workspacePipeline.followupOrchestrator.setSolidaryCoerciveActionPending,
        followupModalChipTablistRef: workspacePipeline.followupOrchestrator.followupModalChipTablistRef,
        followupModalDebtorTabsRef: workspacePipeline.followupOrchestrator.followupModalDebtorTabsRef,
        isSolidaryLiability,
        allDebtorsUnified,
        seizureMatrixRef: workspacePipeline.followupOrchestrator.seizureMatrixRef,
    };
}

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
    followupModalSpecializationEffective:
        ExecutionDashboardCoreGraceMasterEvictionPipelineInput['followupModalSpecializationEffective'];
    followupModalDebtorIsEmployee: boolean;
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
        followupModalSpecializationEffective,
        followupModalDebtorIsEmployee,
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
        followupModalSpecializationEffective,
        followupModalDebtorIsEmployee,
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
    };
}

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
    workspacePipeline: AnyRecord;
    graceMasterPipeline: AnyRecord;
    isRepresentingDebtor?: boolean;
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
    };
}
