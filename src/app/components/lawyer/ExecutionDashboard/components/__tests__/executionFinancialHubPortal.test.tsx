import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExecutionFinancialHubPortal } from '../ExecutionFinancialHubPortal';

function createLazyFinancialOperationsCenter() {
    return React.lazy(async () => ({
        default: (props: {
            onToggle?: () => void;
            onGuarantorRequest?: () => void;
            onPayment?: () => void;
            onSettlement?: () => void;
            onShowLedger?: () => void;
            evictionFinanceStrip?: { onRecordExpense?: () => void } | undefined;
        }) => (
            <div>
                <button type="button" onClick={props.onToggle}>
                    toggle financial center
                </button>
                <button type="button" onClick={props.onPayment}>
                    open payment calculator
                </button>
                <button type="button" onClick={props.onSettlement}>
                    open settlement calculator
                </button>
                <button type="button" onClick={props.onShowLedger}>
                    open ledger
                </button>
                <button type="button" onClick={props.evictionFinanceStrip?.onRecordExpense}>
                    open eviction expense
                </button>
                <button type="button" onClick={props.onGuarantorRequest}>
                    guarantor request
                </button>
            </div>
        ),
    }));
}

function createBaseProps(
    overrides: Partial<React.ComponentProps<typeof ExecutionFinancialHubPortal>> = {},
): React.ComponentProps<typeof ExecutionFinancialHubPortal> {
    return {
        showExecutionFinancialHub: true,
        onCloseFinancialHub: vi.fn(),
        onOpenUnifiedSeizureLog: vi.fn(),
        financialHubAutoOpenMode: null,
        setFinancialHubAutoOpenMode: vi.fn(),
        financialHubSeizedMovableId: null,
        setFinancialHubSeizedMovableId: vi.fn(),
        financialHubSeizedPropertyId: null,
        setFinancialHubSeizedPropertyId: vi.fn(),
        EXEC_MODAL_BACKDROP_STRONG: 'bg-black/50',
        EXEC_MODAL_Z: { unifiedFollowUp: 1000 },
        LazyFinancialOperationsCenter: createLazyFinancialOperationsCenter(),
        EXEC_FOC_LAZY_FALLBACK: <div>loading</div>,
        realEstateSeizureRegistryAssets: [],
        movableSeizureRegistryAssets: [],
        salarySeizureRegistryAssets: [],
        thirdPartySeizureRegistryAssets: [],
        standaloneExecutionMarks: [],
        executionData: { debtors: [{}], creditors: [], guarantor_followup: {} },
        executionId: 'ex-1',
        isFinancialCenterExpanded: false,
        onToggleFinancialCenterExpanded: vi.fn(),
        activeFinancialTab: 0,
        setActiveFinancialTab: vi.fn(),
        principalDebtAmount: 0,
        evictionLawyerFeesInTotals: 0,
        isEvictionExecutionModule: false,
        parsedLawyerFees: 0,
        total_execution_expenses: 0,
        monthlyAlimony: 0,
        totalOwed: 0,
        remaining: 0,
        parsedCourtFees: 0,
        parsedDirectorateFees: 0,
        parsedClientFees: 0,
        financialStatus: { label: 'ok', color: 'green', pulse: false },
        isNonFinancialClaim: false,
        isAlimonyClaim: false,
        claimType: 'financial',
        paidDebt: 0,
        totalWithExecutionFee: 0,
        calculatedExecutionFee: 0,
        shouldCalculateExecutionFee: false,
        accumulatedAlimony: 0,
        paidCourtFees: 0,
        paidDirectorateFees: 0,
        paidClientFees: 0,
        daysSinceNoticeCalculated: 0,
        gracePeriodEnded: false,
        initiator: 'creditor',
        onOpenPaymentCalculator: vi.fn(),
        onOpenSettlementCalculator: vi.fn(),
        handleCoerciveAction: vi.fn(),
        executionStatus: 'active',
        statusMetadata: {},
        isPaused: false,
        onOpenLedgerModal: vi.fn(),
        financialLedger: [],
        evictionCaseExpensesTotalForFinancial: 0,
        evictionCaseExpenses: [],
        onOpenEvictionExpenseModal: vi.fn(),
        handleEvictionLawyerFeeRequest: vi.fn(),
        lawyerFeePayoutApproved: false,
        handleFundsLedgerPayment: vi.fn(),
        setTimelineEvents: vi.fn(),
        nextTimelineId: vi.fn(() => 'tl-1'),
        guarantorFollowupAwaitingDetailsSave: vi.fn(() => false),
        onOpenGuarantorFollowupDetails: vi.fn(),
        appendGuarantorFollowupRequest: vi.fn(() => ({ ok: true, decisionId: 'd-1' })),
        decisionsStorageExecutionId: 'ex-1',
        showToast: vi.fn(),
        timelineDebtorMetadata: vi.fn(() => ({})),
        assignmentWorkspaceCtx: { activeDebtorKey: 'debtor-1' },
        persistExecutionMerge: vi.fn(),
        handleEvictionLedgerActivated: vi.fn(),
        evictionAssetsTabUnlocked: false,
        getLocalTodayYmd: vi.fn(() => '2026-07-10'),
        setCaseTasksPending: vi.fn(),
        onClearSalarySeizurePath: vi.fn(),
        isRepresentingDebtor: false,
        activeDebtorIsDeceased: false,
        ...overrides,
    };
}

describe('ExecutionFinancialHubPortal', () => {
    it('does not render when hidden', () => {
        render(
            <ExecutionFinancialHubPortal
                {...createBaseProps({ showExecutionFinancialHub: false })}
            />,
        );

        expect(screen.queryByRole('dialog', { name: 'المركز المالي' })).toBeNull();
    });

    it('closes from the explicit close button', async () => {
        const onCloseFinancialHub = vi.fn();

        render(
            <ExecutionFinancialHubPortal
                {...createBaseProps({ onCloseFinancialHub })}
            />,
        );

        fireEvent.click(await screen.findByRole('button', { name: 'إغلاق المركز المالي' }));

        expect(onCloseFinancialHub).toHaveBeenCalledTimes(1);
    });

    it('forwards center toggle and guarantor detail opening through explicit callbacks', async () => {
        const onToggleFinancialCenterExpanded = vi.fn();
        const onOpenGuarantorFollowupDetails = vi.fn();
        const appendGuarantorFollowupRequest = vi.fn(() => ({ ok: true, decisionId: 'd-1' }));

        render(
            <ExecutionFinancialHubPortal
                {...createBaseProps({
                    onToggleFinancialCenterExpanded,
                    onOpenGuarantorFollowupDetails,
                    appendGuarantorFollowupRequest,
                    guarantorFollowupAwaitingDetailsSave: vi.fn(() => true),
                })}
            />,
        );

        fireEvent.click(await screen.findByRole('button', { name: 'toggle financial center' }));
        fireEvent.click(screen.getByRole('button', { name: 'guarantor request' }));

        expect(onToggleFinancialCenterExpanded).toHaveBeenCalledTimes(1);
        expect(onOpenGuarantorFollowupDetails).toHaveBeenCalledTimes(1);
        expect(appendGuarantorFollowupRequest).not.toHaveBeenCalled();
    });

    it('forwards ledger and eviction expense opening through explicit callbacks', async () => {
        const onOpenLedgerModal = vi.fn();
        const onOpenEvictionExpenseModal = vi.fn();
        const onOpenPaymentCalculator = vi.fn();
        const onOpenSettlementCalculator = vi.fn();

        render(
            <ExecutionFinancialHubPortal
                {...createBaseProps({
                    isEvictionExecutionModule: true,
                    onOpenPaymentCalculator,
                    onOpenSettlementCalculator,
                    onOpenLedgerModal,
                    onOpenEvictionExpenseModal,
                })}
            />,
        );

        fireEvent.click(await screen.findByRole('button', { name: 'open payment calculator' }));
        fireEvent.click(screen.getByRole('button', { name: 'open settlement calculator' }));
        fireEvent.click(await screen.findByRole('button', { name: 'open ledger' }));
        fireEvent.click(screen.getByRole('button', { name: 'open eviction expense' }));

        expect(onOpenPaymentCalculator).toHaveBeenCalledTimes(1);
        expect(onOpenSettlementCalculator).toHaveBeenCalledTimes(1);
        expect(onOpenLedgerModal).toHaveBeenCalledTimes(1);
        expect(onOpenEvictionExpenseModal).toHaveBeenCalledTimes(1);
    });
});
