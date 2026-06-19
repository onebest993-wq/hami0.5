import { describe, expect, it } from 'vitest';
import {
    buildDebtorLiabilityGroups,
    resolveLiabilityGroupLawyerFees,
    resolveLiabilityGroupPrincipal,
    shouldShowDebtorLiabilityGroupTabs,
    type DebtorLiabilityGroup,
} from '@/app/utils/debtorLiabilityGroups';

const mkEntry = (key: string, name: string, solidary: boolean) =>
    ({
        key,
        unified: { id: key, name, isSolidaryLiability: solidary },
        d: { id: key, name },
        isPrimary: key === '1',
        fileDebtorIndex: key === '1' ? 0 : null,
    }) as never;

const mkIndependentGroup = (key: string, name: string): DebtorLiabilityGroup => ({
    id: 'independent',
    tabKey: `independent:${key}`,
    label: name,
    entries: [mkEntry(key, name, false)],
});

describe('debtorLiabilityGroups', () => {
    it('builds solidary group and one tab per independent debtor', () => {
        const groups = buildDebtorLiabilityGroups([
            mkEntry('1', 'محمد', true),
            mkEntry('2', 'أحمد', true),
            mkEntry('3', 'علي', false),
            mkEntry('4', 'سارة', false),
        ]);
        expect(groups).toHaveLength(3);
        expect(groups[0].id).toBe('solidary');
        expect(groups[0].tabKey).toBe('solidary');
        expect(groups[0].entries).toHaveLength(2);
        expect(groups[1].id).toBe('independent');
        expect(groups[1].tabKey).toBe('independent:3');
        expect(groups[1].label).toBe('علي');
        expect(groups[2].tabKey).toBe('independent:4');
        expect(groups[2].label).toBe('سارة');
    });

    it('resolves principals per liability group', () => {
        const rows = [
            { id: '1', isSolidaryLiability: true, allocated_debt: 3_000_000 },
            { id: '2', isSolidaryLiability: true, allocated_debt: 3_000_000 },
            { id: '3', isSolidaryLiability: false, allocated_debt: 2_000_000 },
        ];
        const solidaryGroup: DebtorLiabilityGroup = {
            id: 'solidary',
            tabKey: 'solidary',
            label: 'الذمة المتضامنة',
            entries: [mkEntry('1', 'محمد', true), mkEntry('2', 'أحمد', true)],
        };
        expect(
            resolveLiabilityGroupPrincipal(rows, { solidaryRemainderDebt: 3_000_000 }, solidaryGroup),
        ).toBe(3_000_000);
        expect(resolveLiabilityGroupPrincipal(rows, {}, mkIndependentGroup('3', 'علي'))).toBe(
            2_000_000,
        );
    });

    it('splits lawyer fees between groups', () => {
        const rows = [
            { id: '3', isSolidaryLiability: false, lawyerFeesClaimAmount: 50_000 },
            { id: '1', isSolidaryLiability: true },
        ];
        const solidaryGroup: DebtorLiabilityGroup = {
            id: 'solidary',
            tabKey: 'solidary',
            label: 'الذمة المتضامنة',
            entries: [mkEntry('1', 'محمد', true)],
        };
        expect(
            resolveLiabilityGroupLawyerFees(rows, 150_000, mkIndependentGroup('3', 'علي')),
        ).toBe(50_000);
        expect(resolveLiabilityGroupLawyerFees(rows, 150_000, solidaryGroup)).toBe(100_000);
    });

    it('shows tabs when multiple debtors in split mode', () => {
        const groups = buildDebtorLiabilityGroups([
            mkEntry('1', 'محمد', true),
            mkEntry('2', 'علي', false),
        ]);
        expect(shouldShowDebtorLiabilityGroupTabs(true, groups)).toBe(true);
    });
});
