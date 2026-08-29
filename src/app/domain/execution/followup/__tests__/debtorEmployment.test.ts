import { describe, expect, it } from 'vitest';
import { inferDebtorEmploymentFlags } from '../debtorEmployment';

describe('inferDebtorEmploymentFlags', () => {
    it('does not treat every non-employee debtor as a freelancer', () => {
        const flags = inferDebtorEmploymentFlags({
            isEmployee: false,
            occupation: 'طالب',
        });
        expect(flags.isGovernmentEmployee).toBe(false);
        expect(flags.isFreelancer).toBe(false);
        expect(flags.isRetired).toBe(false);
    });

    it('flags explicit كاسب as freelancer', () => {
        expect(inferDebtorEmploymentFlags({ occupation: 'كاسب' }).isFreelancer).toBe(true);
    });

    it('flags government employee from occupation', () => {
        const flags = inferDebtorEmploymentFlags({ occupation: 'موظف حكومي' });
        expect(flags.isGovernmentEmployee).toBe(true);
        expect(flags.isFreelancer).toBe(false);
    });
});
