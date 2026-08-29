import { describe, expect, it } from 'vitest';
import { buildDebtorSummonsProfileBundle } from '../buildDebtorSummonsProfileBundle';

describe('buildDebtorSummonsProfileBundle', () => {
    it('preserves current occupation-based government classification behavior', () => {
        const result = buildDebtorSummonsProfileBundle({
            debtors: [{ isEmployee: false, occupation: 'موظف' }],
            principalDebtAmount: 0,
            parsedLawyerFees: 0,
            claimType: 'مطالبة مالية',
            isNonFinancialClaim: false,
            debtorBrowserTabsMode: false,
            activeWorkspaceDebtorForFollowup: null,
        });

        expect(result.isDebtorGovernmentEmployee).toBe(true);
        expect(result.isDebtorFreelancer).toBe(false);
        expect(result.debtorSummonsProfile).toBe('earner_like');
    });

    it('computes followup debtor profile from active debtor tab', () => {
        const result = buildDebtorSummonsProfileBundle({
            debtors: [{ isEmployee: false, occupation: 'كاسب' }],
            principalDebtAmount: 100000,
            parsedLawyerFees: 0,
            claimType: 'مطالبة مالية',
            isNonFinancialClaim: false,
            debtorBrowserTabsMode: true,
            activeWorkspaceDebtorForFollowup: {
                d: { occupation: 'موظف', isEmployee: true },
                isPrimary: false,
            },
        });

        expect(result.debtorSummonsProfile).toBe('earner_like');
        expect(result.followupDebtorSummonsProfile).toBe('employee_monetary');
        expect(result.followupIsDebtorGovernmentEmployee).toBe(true);
    });
});
