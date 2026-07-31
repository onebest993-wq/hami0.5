/** Phase C Slice 25 — claim financials + ledger sync + seizure matrix + followup seizure tabs */
import { useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';
import { useDynamicExpenses } from '../useDynamicExpenses';
import { useFinancialComputed } from '../useFinancialComputed';
import { usePostEntryHeavyComputeReady } from '../usePostEntryHeavyComputeReady';
import {
    useExecutionDashboardClaimFinancials,
    type UseExecutionDashboardClaimFinancialsParams,
} from './useExecutionDashboardClaimFinancials';
import { useExecutionDashboardEvictionLawyerFeeBackfill } from './useExecutionDashboardDecisionAndEventSync';
import { useExecutionDashboardSeizureLedgerOutcomeEffects } from './useExecutionDashboardSeizureLedgerOutcomeEffects';
import { useExecutionDashboardLedgerSync } from './useExecutionDashboardLedgerSync';
import {
    useExecutionDashboardFollowupSeizureTabs,
    type UseExecutionDashboardFollowupSeizureTabsParams,
} from './useExecutionDashboardFollowupSeizureTabs';
import { resolveSeizureMatrixFromExecution } from '@/app/utils/seizureMatrix';
import { resolveIsPersonalStatusExecutionClaim } from './executionDashboardClaimFinancials';
import type { ExecutionDashboardFollowupClusterInput } from './useExecutionDashboardFollowupCluster';
import type { SeizureDecisionOutcomeContext } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureDecisionOutcomeHandler.types';
import type { FinancialHubLedgerOpenContext } from '@/app/components/lawyer/ExecutionDashboard/utils/financialHubLedgerOpenHandler';
import type { UseThirdPartyFundsReceivedOutcomeInput } from '../useThirdPartyFundsReceivedOutcome';

type ClaimFinancialsInput = UseExecutionDashboardClaimFinancialsParams;
type SeizureLedgerEffectsInput = Parameters<typeof useExecutionDashboardSeizureLedgerOutcomeEffects>[0];
type FollowupSeizureTabsInput = UseExecutionDashboardFollowupSeizureTabsParams;
type ActiveWorkspaceDebtorForFollowup =
    ExecutionDashboardFollowupClusterInput['activeWorkspaceDebtorForFollowup'];
type SeizureMatrixRef = MutableRefObject<ReturnType<typeof resolveSeizureMatrixFromExecution> | null>;
type ShowToast = (msg: string, type?: string) => void;
type MoneyLike = string | number | null | undefined;

export type ExecutionDashboardCoreClaimFinancialLedgerPipelineInput = {
    executionData: ExecutionFile | null | undefined;
    viewExecutionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    claimType: string;
    totalAmount: number;
    debtAmount: MoneyLike;
    lawyerFeesAmount: MoneyLike;
    executionFee: MoneyLike;
    clientFeesAmount: MoneyLike;
    courtFees: MoneyLike;
    directorateFees: MoneyLike;
    evictionCaseExpensesSum: number;
    liabilityGroupTabsMode: ClaimFinancialsInput['liabilityGroupTabsMode'];
    activeLiabilityGroup: ClaimFinancialsInput['activeLiabilityGroup'];
    allDebtorRowsForLiability: ClaimFinancialsInput['allDebtorRowsForLiability'];
    activeTimelineEvents: ClaimFinancialsInput['activeTimelineEvents'];
    decisionsStorageExecutionId: string;
    debtorNotificationDate: ClaimFinancialsInput['debtorNotificationDate'];
    effectiveDebtors: ClaimFinancialsInput['effectiveDebtors'];
    executionFileKey: string;
    decisionsReloadEpoch: number;
    persistExecutionMergeRef: SeizureLedgerEffectsInput['persistExecutionMergeRef'];
    executionDataRef: UseThirdPartyFundsReceivedOutcomeInput['executionDataRef'];
    setThirdPartySeizuresUi: UseThirdPartyFundsReceivedOutcomeInput['setThirdPartySeizuresUi'];
    clearThirdPartyFundsDraft: UseThirdPartyFundsReceivedOutcomeInput['clearThirdPartyFundsDraft'];
    setTimelineEvents: UseThirdPartyFundsReceivedOutcomeInput['setTimelineEvents'];
    nextTimelineId: () => string;
    showToast: ShowToast;
    applyThirdPartySeizuresFromPatch: SeizureDecisionOutcomeContext['applyThirdPartySeizuresFromPatch'];
    pushTimelineEventRef: SeizureDecisionOutcomeContext['pushTimelineEventRef'];
    focusSeizurePropertyInlineRef: SeizureDecisionOutcomeContext['focusSeizurePropertyInlineRef'];
    focusSeizureMovableInlineRef: SeizureDecisionOutcomeContext['focusSeizureMovableInlineRef'];
    focusSeizureThirdPartyInlineRef: SeizureDecisionOutcomeContext['focusSeizureThirdPartyInlineRef'];
    focusSeizureNoticeInlineRef: SeizureDecisionOutcomeContext['focusSeizureNoticeInlineRef'];
    openSeizureRequestsTabRef: SeizureDecisionOutcomeContext['openSeizureRequestsTabRef'];
    setShowCoerciveActionForm: SeizureDecisionOutcomeContext['setShowCoerciveActionForm'];
    setSeizureDetailCompletion: SeizureDecisionOutcomeContext['setSeizureDetailCompletion'];
    setShowUnifiedExecutionModal: SeizureDecisionOutcomeContext['setShowUnifiedExecutionModal'];
    setEvictionAssetsTabUnlocked: SeizureLedgerEffectsInput['setEvictionAssetsTabUnlocked'];
    seizedAssetsSnapshotRef: SeizureLedgerEffectsInput['seizedAssetsSnapshotRef'];
    setSeizedAssets: SeizureLedgerEffectsInput['setSeizedAssets'];
    setFinancialHubAutoOpenMode: FinancialHubLedgerOpenContext['setFinancialHubAutoOpenMode'];
    setFinancialHubSeizedMovableId: FinancialHubLedgerOpenContext['setFinancialHubSeizedMovableId'];
    setFinancialHubSeizedPropertyId: FinancialHubLedgerOpenContext['setFinancialHubSeizedPropertyId'];
    openFinancialHubLedger: FinancialHubLedgerOpenContext['openFinancialHubLedger'];
    debtorBrowserTabsMode: boolean;
    activeWorkspaceDebtorForFollowup: ActiveWorkspaceDebtorForFollowup;
    activeDebtorIsEmployee: boolean;
    docType: string;
    classification: string;
    activeDebtorEntityKind: string | null | undefined;
    activeDebtorIsDeceased: boolean;
    followupSpecialization: FollowupSeizureTabsInput['followupSpecialization'];
    followupSectionTabOrder: FollowupSeizureTabsInput['followupSectionTabOrder'];
    followupModalTabs: FollowupSeizureTabsInput['followupModalTabs'];
    followupTabsRestricted: FollowupSeizureTabsInput['followupTabsRestricted'];
    restrictedFollowupTabIds: FollowupSeizureTabsInput['restrictedFollowupTabIds'];
    setUnifiedModalTab: FollowupSeizureTabsInput['setUnifiedModalTab'];
    showUnifiedExecutionModal: FollowupSeizureTabsInput['showUnifiedExecutionModal'];
    unifiedModalTab: FollowupSeizureTabsInput['unifiedModalTab'];
    hideFollowupCoerciveTab: boolean;
    hideCoerciveTabsForDebtorAgent: boolean;
    showPersonalCoerciveFollowupTab: boolean;
    setShowSolidaryCoerciveTargetModal:
        FollowupSeizureTabsInput['setShowSolidaryCoerciveTargetModal'];
    setSolidaryCoerciveActionPending: FollowupSeizureTabsInput['setSolidaryCoerciveActionPending'];
    followupModalChipTablistRef: FollowupSeizureTabsInput['followupModalChipTablistRef'];
    followupModalDebtorTabsRef: FollowupSeizureTabsInput['followupModalDebtorTabsRef'];
    isSolidaryLiability: boolean;
    allDebtorsUnified: ReadonlyArray<unknown>;
    seizureMatrixRef: SeizureMatrixRef;
};

export function useExecutionDashboardCoreClaimFinancialLedgerPipeline(
    p: ExecutionDashboardCoreClaimFinancialLedgerPipelineInput,
) {
    const heavyComputeReady = usePostEntryHeavyComputeReady(true);
    const dynamicExpenses = useDynamicExpenses();

    const {
        parsedDebtAmount,
        parsedLawyerFees,
        parsedExecutionFee,
        parsedClientFees,
        parsedCourtFees,
        parsedDirectorateFees,
        total_execution_expenses,
    } = useFinancialComputed(
        // بعد أول paint فقط — تجنّب حلقات تخصيص الدين على مسار التركيب البارد
        heavyComputeReady ? p.executionData : null,
        p.totalAmount,
        p.debtAmount,
        p.lawyerFeesAmount,
        p.executionFee,
        p.clientFeesAmount,
        p.courtFees,
        p.directorateFees,
        dynamicExpenses,
    );

    const claimFinancials = useExecutionDashboardClaimFinancials({
        executionData: p.executionData,
        viewExecutionData: p.viewExecutionData,
        executionId: p.executionId,
        claimType: p.claimType,
        parsedDebtAmount,
        parsedLawyerFees,
        lawyerFeesAmount: p.lawyerFeesAmount,
        executionFee: p.executionFee,
        total_execution_expenses,
        evictionCaseExpensesSum: p.evictionCaseExpensesSum,
        liabilityGroupTabsMode: p.liabilityGroupTabsMode,
        activeLiabilityGroup: p.activeLiabilityGroup,
        allDebtorRowsForLiability: p.allDebtorRowsForLiability,
        activeTimelineEvents: p.activeTimelineEvents,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        debtorNotificationDate: p.debtorNotificationDate,
        effectiveDebtors: p.effectiveDebtors,
    });

    const {
        isNonFinancialClaim,
        isVisitationClaim,
        isMaritalFurnitureClaim,
        maritalFurnitureItemsForFollowup,
        isAlimonyClaimType,
        principalDebtAmount,
        financialPrincipalAmount,
        financialLawyerFeesAmount,
        claimTypeForExecutionModule,
        executionModuleStrategy,
        hasEvictionSignals,
        hasEvictionTimelineSignals,
        isEvictionExecutionModule,
        judicialCustodiansResolved,
        judicialCustodianSalariesExpenseIqd,
        evictionCaseExpensesTotalForFinancial,
        evictionLawyerFeesInTotals,
        totalOwed,
        unifiedLedgerRevision,
        setUnifiedLedgerRevision,
        seizureMatrixLedgerParams,
        debtorNotifiedForEvictionGrace,
        isAlimonyClaim,
        isHybridFeesNonMonetary,
        monetaryExecutionStrictPathFlag,
        monetaryStrictForSummoningEngine,
    } = claimFinancials;

    useExecutionDashboardEvictionLawyerFeeBackfill({
        isEvictionExecutionModule,
        executionData: p.executionData,
        executionId: p.executionId,
        executionFileKey: p.executionFileKey,
        decisionsReloadEpoch: p.decisionsReloadEpoch,
        persistExecutionMergeRef: p.persistExecutionMergeRef,
    });

    const seizureMatrixLedgerParamsRef = useRef<UnifiedLedgerTotalParams | null>(null);
    seizureMatrixLedgerParamsRef.current = seizureMatrixLedgerParams;

    useExecutionDashboardSeizureLedgerOutcomeEffects({
        executionDataRef: p.executionDataRef,
        executionDataId: p.executionData?.id,
        executionId: p.executionId,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        setThirdPartySeizuresUi: p.setThirdPartySeizuresUi,
        clearThirdPartyFundsDraft: p.clearThirdPartyFundsDraft,
        getLedgerParams: () => seizureMatrixLedgerParamsRef.current,
        setTimelineEvents: p.setTimelineEvents,
        nextTimelineId: p.nextTimelineId,
        persistExecutionMergeRef: p.persistExecutionMergeRef,
        onLedgerRevision: () => setUnifiedLedgerRevision((v) => v + 1),
        showToast: p.showToast,
        applyThirdPartySeizuresFromPatch: p.applyThirdPartySeizuresFromPatch,
        pushTimelineEventRef: p.pushTimelineEventRef,
        seizureMatrixLedgerParamsRef,
        focusSeizurePropertyInlineRef: p.focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef: p.focusSeizureMovableInlineRef,
        focusSeizureThirdPartyInlineRef: p.focusSeizureThirdPartyInlineRef,
        focusSeizureNoticeInlineRef: p.focusSeizureNoticeInlineRef,
        openSeizureRequestsTabRef: p.openSeizureRequestsTabRef,
        setShowCoerciveActionForm: p.setShowCoerciveActionForm,
        setSeizureDetailCompletion: p.setSeizureDetailCompletion,
        setShowUnifiedExecutionModal: p.setShowUnifiedExecutionModal,
        setUnifiedLedgerRevision,
        setEvictionAssetsTabUnlocked: p.setEvictionAssetsTabUnlocked,
        seizedAssetsSnapshotRef: p.seizedAssetsSnapshotRef,
        setSeizedAssets: p.setSeizedAssets,
        setFinancialHubAutoOpenMode: p.setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId: p.setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId: p.setFinancialHubSeizedPropertyId,
        openFinancialHubLedger: p.openFinancialHubLedger,
    });

    const ledgerSync = useExecutionDashboardLedgerSync({
        executionData: p.executionData,
        executionId: p.executionId,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        seizureMatrixLedgerParams,
        unifiedLedgerRevision,
        setUnifiedLedgerRevision,
    });

    const { remainingBalanceForSeizure, settlementGuarantorGate } = ledgerSync;

    const activeFollowupDebtorForSeizureMatrix = useMemo(() => {
        if (p.debtorBrowserTabsMode && p.activeWorkspaceDebtorForFollowup) {
            return p.activeWorkspaceDebtorForFollowup.d;
        }
        return p.executionData?.debtors?.[0];
    }, [p.debtorBrowserTabsMode, p.activeWorkspaceDebtorForFollowup, p.executionData?.debtors]);

    const seizureMatrix = useMemo(
        () =>
            resolveSeizureMatrixFromExecution({
                remainingBalanceIqd: remainingBalanceForSeizure,
                executionData: heavyComputeReady
                    ? (p.viewExecutionData ?? p.executionData)
                    : null,
                activeDebtor: heavyComputeReady
                    ? activeFollowupDebtorForSeizureMatrix
                    : undefined,
                activeDebtorIsEmployee: heavyComputeReady
                    ? p.activeDebtorIsEmployee
                    : false,
            }),
        [
            heavyComputeReady,
            remainingBalanceForSeizure,
            p.viewExecutionData,
            p.executionData,
            activeFollowupDebtorForSeizureMatrix,
            p.activeDebtorIsEmployee,
        ],
    );
    p.seizureMatrixRef.current = seizureMatrix;

    const isPersonalStatusExecutionClaim = useMemo(
        () =>
            resolveIsPersonalStatusExecutionClaim({
                claimType: p.claimType,
                executionData: p.executionData,
                docType: p.docType,
                classification: p.classification,
                activeDebtorEntityKind: p.activeDebtorEntityKind,
            }),
        [p.claimType, p.classification, p.docType, p.executionData, p.activeDebtorEntityKind],
    );

    const followupSeizureTabs = useExecutionDashboardFollowupSeizureTabs({
        activeDebtorIsDeceased: p.activeDebtorIsDeceased,
        activeDebtorIsEmployee: p.activeDebtorIsEmployee,
        viewExecutionData: p.viewExecutionData,
        followupSpecialization: p.followupSpecialization,
        remainingBalanceForSeizure,
        settlementGuarantorGate,
        followupSectionTabOrder: p.followupSectionTabOrder,
        followupModalTabs: p.followupModalTabs,
        seizureMatrix,
        followupTabsRestricted: p.followupTabsRestricted,
        restrictedFollowupTabIds: p.restrictedFollowupTabIds,
        openSeizureRequestsTabRef: p.openSeizureRequestsTabRef,
        setUnifiedModalTab: p.setUnifiedModalTab,
        showToast: p.showToast,
        showUnifiedExecutionModal: p.showUnifiedExecutionModal,
        unifiedModalTab: p.unifiedModalTab,
        hideFollowupCoerciveTab: p.hideFollowupCoerciveTab,
        hideCoerciveTabsForDebtorAgent: p.hideCoerciveTabsForDebtorAgent,
        showPersonalCoerciveFollowupTab: p.showPersonalCoerciveFollowupTab,
        setShowSolidaryCoerciveTargetModal: p.setShowSolidaryCoerciveTargetModal,
        setSolidaryCoerciveActionPending: p.setSolidaryCoerciveActionPending,
        followupModalChipTablistRef: p.followupModalChipTablistRef,
        followupModalDebtorTabsRef: p.followupModalDebtorTabsRef,
        isSolidaryLiability: p.isSolidaryLiability,
        solidaryDebtorCount: p.allDebtorsUnified.length,
    });

    const {
        showGuarantorInSeizureFollowupTab,
        effectiveFollowupSectionTabOrder,
        effectiveFollowupModalTabs,
        openSeizureRequestsTab,
    } = followupSeizureTabs;

    return {
        parsedDebtAmount,
        parsedLawyerFees,
        parsedExecutionFee,
        parsedClientFees,
        parsedCourtFees,
        parsedDirectorateFees,
        total_execution_expenses,
        claimFinancials,
        isNonFinancialClaim,
        isVisitationClaim,
        isMaritalFurnitureClaim,
        maritalFurnitureItemsForFollowup,
        isAlimonyClaimType,
        principalDebtAmount,
        financialPrincipalAmount,
        financialLawyerFeesAmount,
        claimTypeForExecutionModule,
        executionModuleStrategy,
        hasEvictionSignals,
        hasEvictionTimelineSignals,
        isEvictionExecutionModule,
        judicialCustodiansResolved,
        judicialCustodianSalariesExpenseIqd,
        evictionCaseExpensesTotalForFinancial,
        evictionLawyerFeesInTotals,
        totalOwed,
        unifiedLedgerRevision,
        setUnifiedLedgerRevision,
        seizureMatrixLedgerParams,
        seizureMatrixLedgerParamsRef,
        debtorNotifiedForEvictionGrace,
        isAlimonyClaim,
        isHybridFeesNonMonetary,
        monetaryExecutionStrictPathFlag,
        monetaryStrictForSummoningEngine,
        ledgerSync,
        remainingBalanceForSeizure,
        settlementGuarantorGate,
        seizureMatrix,
        isPersonalStatusExecutionClaim,
        followupSeizureTabs,
        showGuarantorInSeizureFollowupTab,
        effectiveFollowupSectionTabOrder,
        effectiveFollowupModalTabs,
        openSeizureRequestsTab,
    };
}
