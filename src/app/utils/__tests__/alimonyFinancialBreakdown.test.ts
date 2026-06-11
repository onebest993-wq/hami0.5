import { describe, expect, it } from 'vitest';
import {
    resolveAlimonyFinancialBreakdown,
    resolveAlimonyPrincipalAmount,
    isPastAlimonyOnlyClaim,
} from '../alimonyFinancialBreakdown';
import type { ExecutionFile } from '@/app/types/execution';

describe('isPastAlimonyOnlyClaim', () => {
    it('returns true for standalone past alimony claim', () => {
        expect(isPastAlimonyOnlyClaim('نفقة ماضية', ['نفقة ماضية'])).toBe(true);
    });

    it('returns false when ongoing alimony is also selected', () => {
        expect(isPastAlimonyOnlyClaim('نفقة', ['نفقة', 'نفقة ماضية'])).toBe(false);
    });
});

describe('resolveAlimonyFinancialBreakdown', () => {
    it('reads past-only claim from pastAlimonyClaim and pastWifeAlimony', () => {
        const file = {
            pastWifeAlimony: 2_400_000,
            pastAlimonyClaim: {
                amount: 2_400_000,
                calculatedMonths: 12,
                pastDurationDays: 360,
                lawsuitDate: '2021-01-01',
                pastStartDate: '2020-01-01',
                pastWifeMonthly: 200_000,
            },
        } as ExecutionFile;

        const breakdown = resolveAlimonyFinancialBreakdown(file);
        expect(breakdown?.pastAccumulation).toBe(2_400_000);
        expect(breakdown?.totalAccumulated).toBe(2_400_000);
        expect(breakdown?.pastDurationDays).toBe(360);
    });

    it('recomputes past amount from stored dates when amount missing', () => {
        const file = {
            pastAlimonyClaim: {
                pastStartDate: '2020-01-01',
                lawsuitDate: '2020-07-01',
                pastWifeMonthly: 300_000,
                pastLawSystem: 'قانون الأحوال الشخصية 1959',
            },
        } as ExecutionFile;

        const breakdown = resolveAlimonyFinancialBreakdown(file);
        expect(breakdown?.pastAccumulation).toBeGreaterThan(0);
        expect(breakdown?.totalAccumulated).toBeGreaterThan(0);
    });

    it('merges alimony.calculated with past fields', () => {
        const file = {
            alimony: {
                calculated: {
                    baseAccumulation: 1_000_000,
                    pastAccumulation: 500_000,
                    totalAccumulated: 1_500_000,
                    baseDurationDays: 90,
                    pastDurationDays: 60,
                },
            },
            pastWifeAlimony: 500_000,
        } as ExecutionFile;

        const breakdown = resolveAlimonyFinancialBreakdown(file);
        expect(breakdown?.baseAccumulation).toBe(1_000_000);
        expect(breakdown?.pastAccumulation).toBe(500_000);
        expect(breakdown?.totalAccumulated).toBe(1_500_000);
    });
});

describe('resolveAlimonyPrincipalAmount', () => {
    it('prefers breakdown total over zero parsed debt', () => {
        const file = {
            pastWifeAlimony: 3_000_000,
            pastAlimonyClaim: { amount: 3_000_000 },
        } as ExecutionFile;
        expect(resolveAlimonyPrincipalAmount(file, 0)).toBe(3_000_000);
    });

    it('falls back to parsed debt when no alimony snapshot', () => {
        expect(resolveAlimonyPrincipalAmount(null, 750_000)).toBe(750_000);
    });
});
