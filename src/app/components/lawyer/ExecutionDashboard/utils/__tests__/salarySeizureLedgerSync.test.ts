import { describe, expect, it } from 'vitest';
import {
    resolveOngoingMonthlyAlimonyIqd,
    resolveSuggestedSalaryDeductionBreakdown,
} from '../salarySeizureLedgerSync';

describe('salarySeizureLedgerSync', () => {
    it('sums ongoing alimony and fifth for alimony claims', () => {
        const breakdown = resolveSuggestedSalaryDeductionBreakdown({
            executionData: {
                claimTypes: ['نفقة'],
                monthlyWifeAlimony: 200_000,
                children_count: 2,
                monthlyChildrenAlimony: 50_000,
            } as never,
            salaryIqd: 1_000_000,
            activeDebtorIsEmployee: false,
        });
        expect(breakdown.ongoingAlimonyIqd).toBe(300_000);
        expect(breakdown.accumulatedFifthIqd).toBe(200_000);
        expect(breakdown.totalIqd).toBe(500_000);
    });

    it('suggests fifth only for employee debt collection', () => {
        const breakdown = resolveSuggestedSalaryDeductionBreakdown({
            executionData: { claimTypes: ['استحصال'] } as never,
            salaryIqd: 500_000,
            activeDebtorIsEmployee: true,
        });
        expect(breakdown.totalIqd).toBe(100_000);
    });

    it('reads ongoing monthly alimony from execution file', () => {
        expect(
            resolveOngoingMonthlyAlimonyIqd({
                monthlyWifeAlimony: 150_000,
                monthlyChildrenAlimony: 25_000,
                children_count: 3,
            } as never)
        ).toBe(225_000);
    });
});
