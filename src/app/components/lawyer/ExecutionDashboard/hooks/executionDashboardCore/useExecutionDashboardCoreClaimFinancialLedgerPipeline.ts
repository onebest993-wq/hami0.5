// @ts-nocheck
/** Phase C Slice 25 — claim financials + ledger sync + seizure matrix + followup seizure tabs */
import { useMemo, useRef } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { UnifiedLedgerTotalParams } from '@/app/components/lawyer/FinancialOperationsCenter/utils';
import { useDynamicExpenses } from '../useDynamicExpenses';
import { useFinancialComputed } from '../useFinancialComputed';
import { useExecutionDashboardClaimFinancials } from './useExecutionDashboardClaimFinancials';
import { useExecutionDashboardEvictionLawyerFeeBackfill } from './useExecutionDashboardDecisionAndEventSync';
import { useExecutionDashboardSeizureLedgerOutcomeEffects } from './useExecutionDashboardSeizureLedgerOutcomeEffects';
import { useExecutionDashboardLedgerSync } from './useExecutionDashboardLedgerSync';
import { useExecutionDashboardFollowupSeizureTabs } from './useExecutionDashboardFollowupSeizureTabs';
import { resolveSeizureMatrixFromExecution } from '@/app/utils/seizureMatrix';
import { resolveIsPersonalStatusExecutionClaim } from './executionDashboardClaimFinancials';

export function useExecutionDashboardCoreClaimFinancialLedgerPipeline(p: {
    executionData: ExecutionFile | null | undefined;
    viewExecutionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    claimType: string;
    totalAmount: number;
    debtAmount: string;
    lawyerFeesAmount: string;
    executionFee: string;
    clientFeesAmount: string;
    courtFees: string;
    directorateFees: string;
    evictionCaseExpensesSum: number;
    liabilityGroupTabsMode: boolean;
    activeLiabilityGroup: unknown;
    allDebtorRowsForLiability: unknown;
    activeTimelineEvents: unknown[];
    decisionsStorageExecutionId: string;
    debtorNotificationDate: string | null;
    effectiveDebtors: unknown;
    executionFileKey: string;
    decisionsReloadEpoch: number;
    persistExecutionMergeRef: { current: unknown };
    executionDataRef: { current: ExecutionFile | null };
    setThirdPartySeizuresUi: (v: unknown) => void;
    clearThirdPartyFundsDraft: () => void;
    setTimelineEvents: (v: unknown) => void;
    nextTimelineId: () => string;
    showToast: (msg: string, type?: string) => void;
    applyThirdPartySeizuresFromPatch: (...args: unknown[]) => unknown;
    pushTimelineEventRef: { current: unknown };
    focusSeizurePropertyInlineRef: { current: unknown };
    focusSeizureMovableInlineRef: { current: unknown };
    focusSeizureThirdPartyInlineRef: { current: unknown };
    focusSeizureNoticeInlineRef: { current: unknown };
    openSeizureRequestsTabRef: { current: unknown };
    setShowCoerciveActionForm: (v: string | null) => void;
    setSeizureDetailCompletion: (v: unknown) => void;
    setShowUnifiedExecutionModal: (v: boolean) => void;
    setEvictionAssetsTabUnlocked: (v: boolean) => void;
    seizedAssetsSnapshotRef: { current: unknown };
    setSeizedAssets: (v: unknown) => void;
    setFinancialHubAutoOpenMode: (v: unknown) => void;
    setFinancialHubSeizedMovableId: (v: unknown) => void;
    setFinancialHubSeizedPropertyId: (v: unknown) => void;
    openFinancialHubLedger: (...args: unknown[]) => unknown;
    debtorBrowserTabsMode: boolean;
    activeWorkspaceDebtorForFollowup: { d: unknown } | null | undefined;
    activeDebtorIsEmployee: boolean;
    docType: string;
    classification: string;
    activeDebtorEntityKind: unknown;
    activeDebtorIsDeceased: boolean;
    followupSpecialization: Record<string, unknown>;
    followupSectionTabOrder: unknown;
    followupModalTabs: unknown;
    followupTabsRestricted: boolean;
    restrictedFollowupTabIds: unknown;
    setUnifiedModalTab: (v: string) => void;
    showUnifiedExecutionModal: boolean;
    unifiedModalTab: string;
    hideCoerciveTabsForDebtorAgent: boolean;
    showPersonalCoerciveFollowupTab: boolean;
    setShowSolidaryCoerciveTargetModal: (v: boolean) => void;
    setSolidaryCoerciveActionPending: (v: unknown) => void;
    followupModalChipTablistRef: { current: unknown };
    followupModalDebtorTabsRef: { current: unknown };
    isSolidaryLiability: boolean;
    allDebtorsUnified: unknown[];
    seizureMatrixRef: { current: unknown };
}) {
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
        p.executionData,
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
                executionData: p.viewExecutionData ?? p.executionData,
                activeDebtor: activeFollowupDebtorForSeizureMatrix,
                activeDebtorIsEmployee: p.activeDebtorIsEmployee,
            }),
        [
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
        hideFollowupCoerciveTab: p.followupSpecialization.hideFollowupCoerciveTab,
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
