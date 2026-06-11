import { describe, expect, it } from 'vitest';
import {
    buildExecutionClaimBreakdown,
    hasOngoingAlimonyInExecution,
    isShariaLinkedFinancialClaim,
    resolveUnifiedVesselPrincipalAmount,
    SHARIA_LINKED_FINANCIAL_CLAIM_VALUES,
} from '../executionFormUtils';

describe('sharia linked financial claims', () => {
    it('includes the five combinable claim values', () => {
        expect(SHARIA_LINKED_FINANCIAL_CLAIM_VALUES).toEqual([
            'نفقة',
            'نفقة ماضية',
            'نفقة عدة',
            'تعويض عن طلاق تعسفي',
            'مهر مؤجل',
        ]);
    });

    it('detects linked claims and excludes standalone sharia claims', () => {
        expect(isShariaLinkedFinancialClaim('نفقة عدة')).toBe(true);
        expect(isShariaLinkedFinancialClaim('مشاهدة')).toBe(false);
        expect(isShariaLinkedFinancialClaim('تسليم ولد')).toBe(false);
    });

    it('builds per-claim breakdown from stored execution data', () => {
        const rows = buildExecutionClaimBreakdown({
            claimTypes: ['نفقة ماضية', 'مهر مؤجل', 'تعويض عن طلاق تعسفي'],
            claimAmountsByType: {
                'مهر مؤجل': 500000,
                'تعويض عن طلاق تعسفي': 2000000,
            },
            pastAlimonyClaim: { amount: 1500000 },
        });
        expect(rows).toHaveLength(3);
        expect(rows.find((r) => r.claimType === 'مهر مؤجل')?.amount).toBe(500000);
        expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(4000000);
    });

    it('does not double-count past alimony in ongoing row when both are selected', () => {
        const data = {
            claimTypes: ['نفقة', 'نفقة ماضية', 'نفقة عدة', 'مهر مؤجل', 'تعويض عن طلاق تعسفي'],
            claimAmountsByType: {
                'نفقة عدة': 300_000,
                'مهر مؤجل': 500_000,
                'تعويض عن طلاق تعسفي': 2_000_000,
            },
            alimony: {
                calculated: {
                    baseAccumulation: 1_000_000,
                    pastAccumulation: 800_000,
                    totalAccumulated: 1_800_000,
                },
            },
            pastAlimonyClaim: { amount: 800_000 },
            totalAmount: 4_600_000,
        };
        const rows = buildExecutionClaimBreakdown(data);
        expect(rows.find((r) => r.claimType === 'نفقة')?.amount).toBe(1_000_000);
        expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(4_600_000);
        expect(resolveUnifiedVesselPrincipalAmount(data, 4_600_000)).toBe(4_600_000);
    });

    it('treats past alimony alone as ordinary debt without ongoing alimony flag', () => {
        expect(hasOngoingAlimonyInExecution({ claimTypes: ['نفقة ماضية'] })).toBe(false);
        expect(hasOngoingAlimonyInExecution({ claimTypes: ['نفقة', 'نفقة ماضية'] })).toBe(true);
    });
});
