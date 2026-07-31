import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ExecutionFile } from '@/app/types/execution';
import type { DebtorLiabilityGroup } from '@/app/utils/debtorLiabilityGroups';
import { useExecutionDashboardClaimFinancials } from '../useExecutionDashboardClaimFinancials';

function createExecutionData(
    overrides: Partial<ExecutionFile> = {},
): ExecutionFile {
    return {
        id: 'exec-1',
        directorate: 'الرصافة' as never,
        fileNumber: '1',
        executionDate: '2026-07-01',
        submissionDate: '2026-07-01',
        claimType: 'مطالبة مالية' as never,
        documentType: 'حكم' as never,
        documentDate: '2026-07-01',
        creditors: [],
        debtors: [
            {
                id: 'debtor-1',
                name: 'مدين أول',
                notificationDate: '2026-07-02',
            } as never,
        ],
        debtAmount: 900,
        currency: 'IQD' as never,
        courtFees: 20,
        directorateFees: 10,
        lawyerFees: 100,
        clientFees: 5,
        executionFee: 50,
        paidDebt: 0,
        paidCourtFees: 0,
        paidDirectorateFees: 0,
        paidClientFees: 0,
        status: 'active' as never,
        isPaused: false,
        party_multiplicity: {
            additionalCreditors: [],
            additionalDebtors: [],
            isSolidaryLiability: true,
            solidaryRemainderDebt: 250,
        },
        ...overrides,
    } as ExecutionFile;
}

describe('useExecutionDashboardClaimFinancials', () => {
    it('applies liability-group financial slicing from typed debtor rows', () => {
        const activeLiabilityGroup: DebtorLiabilityGroup = {
            id: 'solidary',
            tabKey: 'solidary',
            label: 'الذمة المتضامنة',
            entries: [],
        };
        const executionData = createExecutionData();

        const { result } = renderHook(() =>
            useExecutionDashboardClaimFinancials({
                executionData,
                viewExecutionData: executionData,
                executionId: executionData.id,
                claimType: 'مطالبة مالية',
                parsedDebtAmount: 900,
                parsedLawyerFees: 100,
                lawyerFeesAmount: '100',
                executionFee: '50',
                total_execution_expenses: 30,
                evictionCaseExpensesSum: 40,
                liabilityGroupTabsMode: true,
                activeLiabilityGroup,
                allDebtorRowsForLiability: [
                    {
                        id: 'debtor-1',
                        allocated_debt: 400,
                        lawyerFeesClaimAmount: 20,
                        isSolidaryLiability: true,
                    },
                ],
                activeTimelineEvents: [],
                decisionsStorageExecutionId: executionData.id,
                debtorNotificationDate: null,
                effectiveDebtors: executionData.debtors,
            }),
        );

        expect(result.current.principalDebtAmount).toBe(900);
        expect(result.current.financialPrincipalAmount).toBe(250);
        expect(result.current.financialLawyerFeesAmount).toBe(100);
        expect(result.current.isEvictionExecutionModule).toBe(false);
        expect(result.current.totalOwed).toBe(380);
        expect(result.current.debtorNotifiedForEvictionGrace).toBe(true);
    });

    it('builds eviction ledger params from typed execution fields and bumps revision on focus', () => {
        const executionData = createExecutionData({
            claimType: 'تخلية' as never,
            eviction_executor_vacate_grant_approved: true,
            eviction_initial_notice_lawyer_fees_included: true,
            eviction_lawyer_fee_waived_at_intake: true,
        });

        const { result } = renderHook(() =>
            useExecutionDashboardClaimFinancials({
                executionData,
                viewExecutionData: executionData,
                executionId: executionData.id,
                claimType: 'تخلية',
                parsedDebtAmount: 0,
                parsedLawyerFees: 100,
                lawyerFeesAmount: '100',
                executionFee: '50',
                total_execution_expenses: 30,
                evictionCaseExpensesSum: 40,
                liabilityGroupTabsMode: false,
                activeLiabilityGroup: null,
                allDebtorRowsForLiability: [],
                activeTimelineEvents: [],
                decisionsStorageExecutionId: executionData.id,
                debtorNotificationDate: '2026-07-02',
                effectiveDebtors: executionData.debtors,
            }),
        );

        expect(result.current.isEvictionExecutionModule).toBe(true);
        expect(result.current.seizureMatrixLedgerParams.seedLawyerId).toBe('seed-lawyer-exec-1');
        expect(result.current.seizureMatrixLedgerParams.evictionLawyerFeeWaivedAtIntake).toBe(false);
        expect(result.current.unifiedLedgerRevision).toBe(0);

        act(() => {
            window.dispatchEvent(new Event('focus'));
        });

        expect(result.current.unifiedLedgerRevision).toBe(1);
    });

    it('surfaces failed marital furniture principal for non-financial claim dossiers', () => {
        const executionData = createExecutionData({
            claimType: 'أثاث زوجية' as never,
            maritalFurnitureItems: [
                {
                    id: 'item-a',
                    name: 'خزانة',
                    quantity: 1,
                    unitPriceIqd: 1_633_665,
                    delivered: false,
                    deliveryOutcome: 'failed',
                    deliveryRecordedAt: '2026-07-31T12:00:00.000Z',
                },
            ],
        } as never);

        const { result } = renderHook(() =>
            useExecutionDashboardClaimFinancials({
                executionData,
                viewExecutionData: executionData,
                executionId: executionData.id,
                claimType: 'أثاث زوجية',
                parsedDebtAmount: 0,
                parsedLawyerFees: 0,
                lawyerFeesAmount: '0',
                executionFee: '0',
                total_execution_expenses: 0,
                evictionCaseExpensesSum: 0,
                liabilityGroupTabsMode: false,
                activeLiabilityGroup: null,
                allDebtorRowsForLiability: [],
                activeTimelineEvents: [],
                decisionsStorageExecutionId: executionData.id,
                debtorNotificationDate: null,
                effectiveDebtors: executionData.debtors,
            }),
        );

        expect(result.current.isNonFinancialClaim).toBe(true);
        expect(result.current.isMaritalFurnitureClaim).toBe(true);
        expect(result.current.principalDebtAmount).toBe(1_633_665);
        expect(result.current.financialPrincipalAmount).toBe(1_633_665);
    });
});
