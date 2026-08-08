import { describe, expect, it } from 'vitest';
import { resolveEarnerFinancialPersonalCoerciveFlags } from '../executionDashboardEarnerFinancialCoerciveGate';

describe('resolveEarnerFinancialPersonalCoerciveFlags', () => {
    it('unlocks personal coercive for earner above 250k without showing judge card below 500k', () => {
        const flags = resolveEarnerFinancialPersonalCoerciveFlags({
            isEmployee: false,
            financialCenterTotalIqd: 300_000,
        });
        expect(flags.earnerFinancialPersonalCoerciveActive).toBe(true);
        expect(flags.hideExecutiveDetentionJudgeCard).toBe(true);
        expect(flags.earnerPersonalCoerciveFinancialThresholdMet).toBe(true);
    });

    it('shows executive detention judge card at 500k+ for earner', () => {
        const flags = resolveEarnerFinancialPersonalCoerciveFlags({
            isEmployee: false,
            financialCenterTotalIqd: 500_000,
        });
        expect(flags.earnerFinancialPersonalCoerciveActive).toBe(true);
        expect(flags.hideExecutiveDetentionJudgeCard).toBe(false);
    });

    it('disables earner gate for employees', () => {
        const flags = resolveEarnerFinancialPersonalCoerciveFlags({
            isEmployee: true,
            financialCenterTotalIqd: 900_000,
        });
        expect(flags.earnerFinancialPersonalCoerciveActive).toBe(false);
        expect(flags.hideExecutiveDetentionJudgeCard).toBe(true);
        expect(flags.earnerPersonalCoerciveFinancialThresholdMet).toBe(false);
    });

    it('shows judge detention card for explicit financial debt collection below 500k', () => {
        const flags = resolveEarnerFinancialPersonalCoerciveFlags({
            isEmployee: false,
            financialCenterTotalIqd: 300_000,
            isFinancialDebtCollection: true,
        });
        expect(flags.hideExecutiveDetentionJudgeCard).toBe(false);
    });

    it('keeps judge detention hidden for employees on financial debt collection', () => {
        const flags = resolveEarnerFinancialPersonalCoerciveFlags({
            isEmployee: true,
            financialCenterTotalIqd: 300_000,
            isFinancialDebtCollection: true,
        });
        expect(flags.hideExecutiveDetentionJudgeCard).toBe(true);
    });
});
