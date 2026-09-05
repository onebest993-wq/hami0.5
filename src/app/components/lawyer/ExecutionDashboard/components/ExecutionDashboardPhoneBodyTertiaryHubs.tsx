import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import { getLocalTodayYmd } from '../executionDashboardDate';
import { EXEC_FOC_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';
import { PreloadableOverlayGate } from '../preloadableOverlayGate';
import type { ExecutionDashboardPhoneBodyDeferredScope } from './ExecutionDashboardPhoneBodyDeferredScope';
import { LazyExecutionFinancialHubPortal } from '../executionFinancialHubPortalLazy';
import { LazyFinancialOperationsCenter } from '../executionFinancialOperationsCenterLazy';
import { ExecutionFinancialHubInstantFrame } from './executionOverlayInstantPresets';

export type ExecutionDashboardPhoneBodyTertiaryHubsProps = {
    scope: ExecutionDashboardPhoneBodyDeferredScope;
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
        appendGuarantorFollowupRequest,
        persistGuarantorFollowupDetails,
        assignmentWorkspaceCtx,
        calculatedExecutionFee,
        claimType,
        clearActiveSalarySeizurePath,
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
        paidClientFees,
        paidCourtFees,
        paidDebt,
        paidDirectorateFees,
        parsedClientFees,
        parsedCourtFees,
        parsedDirectorateFees,
        persistExecutionMerge,
        realEstateSeizureRegistryAssets,
        remaining,
        salarySeizureRegistryAssets,
        setActiveFinancialTab,
        setCaseTasksPending,
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        showExecutionFinancialHub,
        showToast,
        standaloneExecutionMarks,
        statusMetadata,
        thirdPartySeizureRegistryAssets,
        timelineDebtorMetadata,
        totalOwed,
        totalWithExecutionFee,
        total_execution_expenses,
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
                        accumulatedAlimony,
                        claimType,
                        isAlimonyClaim,
                        isNonFinancialClaim,
                        remaining,
                        paidDebt,
                        paidCourtFees,
                        paidDirectorateFees,
                        paidClientFees,
                        parsedCourtFees,
                        parsedDirectorateFees,
                        parsedClientFees,
                        calculatedExecutionFee,
                        totalWithExecutionFee,
                        totalOwed,
                        shouldCalculateExecutionFee,
                        daysSinceNoticeCalculated,
                        gracePeriodEnded,
                        initiator,
                        financialStatus,
                        financialLedger,
                        statusMetadata,
                        handleFundsLedgerPayment,
                        evictionCaseExpenses,
                        evictionCaseExpensesTotalForFinancial,
                        handleEvictionLawyerFeeRequest,
                        lawyerFeePayoutApproved,
                        handleCoerciveAction,
                        openGuarantorFollowupDetails,
                        guarantorFollowupAwaitingDetailsSave,
                        appendGuarantorFollowupRequest,
                        persistGuarantorFollowupDetails,
                        onOpenPaymentCalculator: directOpenPaymentCalculator,
                        onOpenSettlementCalculator: directOpenSettlementCalculator,
                        onOpenLedgerModal: directOpenLedgerModal,
                        onOpenEvictionExpenseModal: directOpenEvictionExpenseModal,
                        executionStatus,
                        isPaused,
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
        </>
    );
}
