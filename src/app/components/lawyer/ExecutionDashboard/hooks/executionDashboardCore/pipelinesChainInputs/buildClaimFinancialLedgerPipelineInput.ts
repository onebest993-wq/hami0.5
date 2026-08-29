/** Claim/financial ledger pipeline chain input builder */
import type {
    ExecutionDashboardCoreClaimFinancialLedgerPipelineInput,
    UseExecutionDashboardClaimFinancialsParams,
} from './types';
import type { ExecutionDashboardCoreWorkspacePipelineValue } from '../executionDashboardCoreWorkspacePipelineTypes';

type AnyRecord = Record<string, unknown>;

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
    showToast: ExecutionDashboardCoreWorkspacePipelineValue['showToast'];
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
    openFollowupModalPersisted:
        ExecutionDashboardCoreClaimFinancialLedgerPipelineInput['openFollowupModalPersisted'];
    workspacePipeline: ExecutionDashboardCoreWorkspacePipelineValue;
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
        openFollowupModalPersisted,
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
        openFollowupModalPersisted,
    };
}
