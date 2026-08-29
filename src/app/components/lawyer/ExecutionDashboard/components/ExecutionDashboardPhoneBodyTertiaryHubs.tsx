import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import { getLocalTodayYmd } from '../executionDashboardDate';
import { EXEC_FOC_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';
import { PreloadableOverlayGate } from '../preloadableOverlayGate';
import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';
import type { SaveSeizedMovableInitInput } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardFollowupSeizureInits';
import type { ExecutionDashboardPhoneBodyDeferredScope } from './ExecutionDashboardPhoneBodyDeferredScope';
import { LazyUnifiedSeizureLogHost } from '../executionDashboardLazyRegistryShell';
import { LazyExecutionFinancialHubPortal } from '../executionFinancialHubPortalLazy';
import { LazyFinancialOperationsCenter } from '../executionFinancialOperationsCenterLazy';
import {
    ExecutionFinancialHubInstantFrame,
    ExecutionSeizureLogInstantFrame,
} from './executionOverlayInstantPresets';
import type { SeizedMovable, SeizedProperty } from '@/app/types/execution';
import {
    mergeSeizedMovableLists,
    mergeSeizedPropertyLists,
} from '../utils/executionPhoneBodyExecutionDataMerge';

function seizedMovablesFromExecutionData(
    executionData: ExecutionDashboardPhoneBodyDeferredScope['executionData'],
    fallback: SeizedMovable[],
): SeizedMovable[] {
    const rows = executionData?.seizedMovables;
    const fromData = Array.isArray(rows) ? rows : [];
    return mergeSeizedMovableLists(fromData, fallback);
}

function seizedPropertiesFromExecutionData(
    executionData: ExecutionDashboardPhoneBodyDeferredScope['executionData'],
    fallback: SeizedProperty[],
): SeizedProperty[] {
    const rows = executionData?.seizedProperties;
    const fromData = Array.isArray(rows) ? rows : [];
    return mergeSeizedPropertyLists(fromData, fallback);
}

export type ExecutionDashboardPhoneBodyTertiaryHubsProps = {
    scope: ExecutionDashboardPhoneBodyDeferredScope;
    propertyInlineSaveCtx: PropertyInlineSaveContext;
    movableInlineSaveCtx: MovableInlineSaveContext;
    saveSeizedMovableInitForDecision: (input: SaveSeizedMovableInitInput) => SeizedMovable | null | void;
    closeFinancialHubPortal: () => void;
    toggleFinancialCenterExpanded: () => void;
    openGuarantorFollowupDetails: () => void;
    directOpenPaymentCalculator: () => void;
    directOpenSettlementCalculator: () => void;
    directOpenLedgerModal: () => void;
    directOpenEvictionExpenseModal: () => void;
    expandDebtor?: (debtorKey: string) => void;
    primaryDebtorWorkspaceKey?: string;
    setShowUnifiedExecutionModal?: Dispatch<SetStateAction<boolean>>;
    setExecutionDebtorTabIndex?: Dispatch<SetStateAction<number>>;
};

export function ExecutionDashboardPhoneBodyTertiaryHubs({
    scope,
    propertyInlineSaveCtx,
    movableInlineSaveCtx,
    saveSeizedMovableInitForDecision,
    closeFinancialHubPortal,
    toggleFinancialCenterExpanded,
    openGuarantorFollowupDetails,
    directOpenPaymentCalculator,
    directOpenSettlementCalculator,
    directOpenLedgerModal,
    directOpenEvictionExpenseModal,
    expandDebtor,
    primaryDebtorWorkspaceKey,
    setShowUnifiedExecutionModal,
    setExecutionDebtorTabIndex,
}: ExecutionDashboardPhoneBodyTertiaryHubsProps) {
    const {
        activeDebtorIsDeceased,
        activeFinancialTab,
        accumulatedAlimony,
        appealPerspective,
        appendGuarantorFollowupRequest,
        assignmentWorkspaceCtx,
        beginThirdPartyReceiveStep,
        calculatedExecutionFee,
        cancelThirdPartyReceiveStep,
        claimType,
        clearActiveSalarySeizurePath,
        closeUnifiedSeizureLog,
        confirmThirdPartyReceive,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        executionData,
        executionId,
        executionStatus,
        evictionAssetsTabUnlocked,
        evictionCaseExpenses,
        evictionCaseExpensesTotalForFinancial,
        evictionLawyerFeesInTotals,
        financialHubAutoOpenMode,
        financialHubSeizedMovableId,
        financialHubSeizedPropertyId,
        financialLedger,
        financialLawyerFeesAmount,
        financialPrincipalAmount,
        financialStatus,
        focusSeizureMovableInlineCompletion,
        focusSeizurePropertyInlineCompletion,
        followupSalarySeizureLabel,
        getLocalTodayYmd: scopeGetLocalTodayYmd,
        guarantorFollowupAwaitingDetailsSave,
        handleCoerciveAction,
        handleEvictionLawyerFeeRequest,
        handleEvictionLedgerActivated,
        handleFundsLedgerPayment,
        isAlimonyClaim,
        isEvictionExecutionModule,
        isFinancialCenterExpanded,
        isNonFinancialClaim,
        isPaused,
        isRepresentingDebtor,
        lawyerFeePayoutApproved,
        monthlyAlimony,
        movableSeizureRegistryAssets,
        nextTimelineId,
        paidClientFees,
        paidCourtFees,
        paidDebt,
        paidDirectorateFees,
        parsedClientFees,
        parsedCourtFees,
        parsedDirectorateFees,
        patchSalarySeizureAssetDetails,
        persistExecutionMerge,
        realEstateSeizureRegistryAssets,
        releaseSeizureAssetRow,
        remaining,
        salarySeizureRegistryAssets,
        salarySeizureTabRows,
        seizureLogExecutorDecisions,
        seizureMatrixLedgerParamsRef,
        setActiveFinancialTab,
        setCaseTasksPending,
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        setThirdPartyFundsDraftById,
        setThirdPartySeizuresUi,
        setTimelineEvents,
        setUnifiedLedgerRevision,
        setUnifiedSeizureLogTab,
        showExecutionFinancialHub,
        showToast,
        showUnifiedSeizureLogModal,
        standaloneExecutionMarks,
        statusMetadata,
        thirdPartyFundsDraftById,
        thirdPartySeizureRegistryAssets,
        thirdPartySeizuresUi,
        timelineDebtorMetadata,
        totalOwed,
        totalWithExecutionFee,
        total_execution_expenses,
        unifiedSeizureLogEntries,
        unifiedSeizureLogTab,
        unifiedSeizureTabCounts,
        updateThirdPartyReceiveDraft,
        viewExecutionData,
        shouldCalculateExecutionFee,
        daysSinceNoticeCalculated,
        gracePeriodEnded,
        initiator,
    } = scope;

    return (
        <>
            {showExecutionFinancialHub ? (
                <PreloadableOverlayGate
                    lazy={LazyExecutionFinancialHubPortal}
                    fallback={
                        <ExecutionFinancialHubInstantFrame
                            onClose={closeFinancialHubPortal}
                            isRepresentingDebtor={isRepresentingDebtor}
                        />
                    }
                    lazyProps={{
                        showExecutionFinancialHub,
                        onCloseFinancialHub: closeFinancialHubPortal,
                        onOpenUnifiedSeizureLog: () => scope.openUnifiedSeizureLog(),
                        financialHubAutoOpenMode,
                        setFinancialHubAutoOpenMode,
                        financialHubSeizedMovableId,
                        setFinancialHubSeizedMovableId,
                        financialHubSeizedPropertyId,
                        setFinancialHubSeizedPropertyId,
                        EXEC_MODAL_BACKDROP_STRONG,
                        EXEC_MODAL_Z,
                        LazyFinancialOperationsCenter,
                        EXEC_FOC_LAZY_FALLBACK,
                        realEstateSeizureRegistryAssets,
                        movableSeizureRegistryAssets,
                        salarySeizureRegistryAssets,
                        thirdPartySeizureRegistryAssets,
                        standaloneExecutionMarks,
                        executionData: viewExecutionData,
                        executionId,
                        isFinancialCenterExpanded,
                        onToggleFinancialCenterExpanded: toggleFinancialCenterExpanded,
                        activeFinancialTab,
                        setActiveFinancialTab,
                        principalDebtAmount: financialPrincipalAmount,
                        evictionLawyerFeesInTotals,
                        isEvictionExecutionModule,
                        parsedLawyerFees: financialLawyerFeesAmount,
                        total_execution_expenses,
                        monthlyAlimony,
                        totalOwed,
                        remaining,
                        parsedCourtFees,
                        parsedDirectorateFees,
                        parsedClientFees,
                        financialStatus,
                        isNonFinancialClaim,
                        isAlimonyClaim,
                        claimType,
                        paidDebt,
                        totalWithExecutionFee,
                        calculatedExecutionFee,
                        shouldCalculateExecutionFee,
                        accumulatedAlimony,
                        paidCourtFees,
                        paidDirectorateFees,
                        paidClientFees,
                        daysSinceNoticeCalculated,
                        gracePeriodEnded,
                        initiator,
                        onOpenPaymentCalculator: directOpenPaymentCalculator,
                        onOpenSettlementCalculator: directOpenSettlementCalculator,
                        handleCoerciveAction,
                        executionStatus,
                        statusMetadata: statusMetadata as never,
                        isPaused,
                        onOpenLedgerModal: directOpenLedgerModal,
                        financialLedger: financialLedger as never,
                        evictionCaseExpensesTotalForFinancial,
                        evictionCaseExpenses: evictionCaseExpenses as never,
                        onOpenEvictionExpenseModal: directOpenEvictionExpenseModal,
                        handleEvictionLawyerFeeRequest,
                        lawyerFeePayoutApproved,
                        handleFundsLedgerPayment,
                        setTimelineEvents,
                        nextTimelineId,
                        guarantorFollowupAwaitingDetailsSave,
                        onOpenGuarantorFollowupDetails: openGuarantorFollowupDetails,
                        appendGuarantorFollowupRequest,
                        decisionsStorageExecutionId,
                        showToast,
                        timelineDebtorMetadata,
                        assignmentWorkspaceCtx,
                        persistExecutionMerge,
                        handleEvictionLedgerActivated,
                        evictionAssetsTabUnlocked,
                        getLocalTodayYmd:
                            typeof scopeGetLocalTodayYmd === 'function'
                                ? scopeGetLocalTodayYmd
                                : getLocalTodayYmd,
                        setCaseTasksPending: setCaseTasksPending as never,
                        onClearSalarySeizurePath: clearActiveSalarySeizurePath,
                        isRepresentingDebtor,
                        activeDebtorIsDeceased,
                        expandDebtor,
                        primaryDebtorWorkspaceKey,
                        setShowUnifiedExecutionModal,
                        setExecutionDebtorTabIndex,
                    }}
                />
            ) : null}

            {showUnifiedSeizureLogModal && !isRepresentingDebtor ? (
                <PreloadableOverlayGate
                    lazy={LazyUnifiedSeizureLogHost}
                    fallback={
                        <ExecutionSeizureLogInstantFrame onClose={closeUnifiedSeizureLog} />
                    }
                    lazyProps={{
                        isRepresentingDebtor,
                        showModal: showUnifiedSeizureLogModal,
                        hasContent: scope.hasUnifiedSeizureLogContent,
                        activeTab: unifiedSeizureLogTab,
                        onTabChange: setUnifiedSeizureLogTab,
                        counts: unifiedSeizureTabCounts,
                        entries: unifiedSeizureLogEntries,
                        onClose: closeUnifiedSeizureLog,
                        footer: {
                            seizedPropertiesForSeizureLog: seizedPropertiesFromExecutionData(
                                executionData,
                                scope.seizedPropertiesForSeizureLog ?? [],
                            ),
                            seizedMovablesForSeizureLog: seizedMovablesFromExecutionData(
                                executionData,
                                scope.seizedMovablesForSeizureLog ?? [],
                            ),
                            realEstateSeizureRegistryAssets,
                            movableSeizureRegistryAssets,
                            salarySeizureTabRows,
                            thirdPartySeizureRegistryAssets,
                            thirdPartySeizuresUi,
                            thirdPartyFundsDraftById,
                            setThirdPartyFundsDraftById,
                            setThirdPartySeizuresUi,
                            decisionsStorageExecutionId,
                            executionId,
                            executionData: executionData ?? null,
                            seizureLogExecutorDecisions,
                            propertyInlineSaveCtx,
                            movableInlineSaveCtx,
                            saveSeizedMovableInitForDecision,
                            decisionsReloadEpoch,
                            appealPerspective,
                            showToast,
                            focusSeizurePropertyInlineCompletion,
                            focusSeizureMovableInlineCompletion,
                            followupSalarySeizureLabel,
                            activeDebtorIsDeceased,
                            patchSalarySeizureAssetDetails,
                            releaseSeizureAssetRow,
                            persistExecutionMerge,
                            setTimelineEvents,
                            nextTimelineId,
                            getLedgerParams: () => seizureMatrixLedgerParamsRef.current,
                            onLedgerRevision: () => setUnifiedLedgerRevision((v: number) => v + 1),
                            beginThirdPartyReceiveStep,
                            updateThirdPartyReceiveDraft,
                            cancelThirdPartyReceiveStep,
                            confirmThirdPartyReceive,
                        },
                    }}
                />
            ) : null}
        </>
    );
}
