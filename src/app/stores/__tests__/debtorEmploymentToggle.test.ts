import { describe, expect, it } from 'vitest';
import {
    buildDebtorEmploymentTogglePatch,
    debtorEmploymentToggleMenuLabel,
    isDebtorRowEmployee,
} from '@/app/stores/executionDashboardStore';

describe('debtor employment toggle', () => {
    it('isDebtorRowEmployee prefers explicit isEmployee over occupation', () => {
        expect(isDebtorRowEmployee({ isEmployee: true, occupation: 'كاسب' })).toBe(true);
        expect(isDebtorRowEmployee({ isEmployee: false, occupation: 'موظف' })).toBe(false);
        expect(isDebtorRowEmployee({ occupation: 'موظف' })).toBe(true);
        expect(isDebtorRowEmployee({ occupation: 'كاسب' })).toBe(false);
    });

    it('debtorEmploymentToggleMenuLabel reflects current status', () => {
        expect(debtorEmploymentToggleMenuLabel(true)).toBe('تحويل إلى كاسب');
        expect(debtorEmploymentToggleMenuLabel(false)).toBe('توظيف');
    });

    it('buildDebtorEmploymentTogglePatch syncs parties[] for primary debtor', () => {
        const executionData = {
            debtors: [
                {
                    id: 'primary_debtor',
                    name: 'أحمد',
                    occupation: 'كاسب',
                    isEmployee: false,
                },
            ],
            parties: [
                { id: 1, name: 'دائن', role: 'الدائن' },
                { id: 'primary_debtor', name: 'أحمد', role: 'المدين', occupation: 'كاسب', isEmployee: false },
            ],
        };
        const patch = buildDebtorEmploymentTogglePatch(executionData, 'primary_debtor');
        const debtorParty = (patch!.parties as unknown[])[1] as Record<string, unknown>;
        expect(debtorParty.isEmployee).toBe(true);
        expect(debtorParty.occupation).toBe('موظف');
    });

    it('buildDebtorEmploymentTogglePatch toggles primary debtor and mirrors debtor', () => {
        const executionData = {
            debtors: [
                {
                    id: 'primary_debtor',
                    name: 'أحمد',
                    occupation: 'موظف',
                    employmentType: 'موظف',
                    isEmployee: true,
                    employmentInitialWasEmployee: true,
                },
            ],
            debtor: {
                id: 'primary_debtor',
                name: 'أحمد',
                occupation: 'موظف',
                isEmployee: true,
            },
        };

        const patch = buildDebtorEmploymentTogglePatch(executionData, 'primary_debtor');
        expect(patch).not.toBeNull();
        const next0 = (patch!.debtors as unknown[])[0] as Record<string, unknown>;
        expect(next0.isEmployee).toBe(false);
        expect(next0.occupation).toBe('كاسب');
        expect(next0.employmentInitialWasEmployee).toBe(true);
        expect((patch!.debtor as Record<string, unknown>).occupation).toBe('كاسب');

        const backPatch = buildDebtorEmploymentTogglePatch(
            { ...executionData, ...patch },
            'primary_debtor',
        );
        const back0 = (backPatch!.debtors as unknown[])[0] as Record<string, unknown>;
        expect(back0.isEmployee).toBe(true);
        expect(back0.occupation).toBe('موظف');
    });

    it('buildDebtorEmploymentTogglePatch toggles additional debtor', () => {
        const executionData = {
            debtors: [{ id: 'p1', occupation: 'كاسب', isEmployee: false }],
            party_multiplicity: {
                additionalDebtors: [
                    {
                        id: 'ad-1',
                        name: 'علي',
                        occupation: 'كاسب',
                        isEmployee: false,
                        employmentInitialWasEmployee: false,
                    },
                ],
            },
        };

        const patch = buildDebtorEmploymentTogglePatch(executionData, 'ad-1');
        const nextAd = patch!.party_multiplicity!.additionalDebtors![0] as Record<string, unknown>;
        expect(nextAd.isEmployee).toBe(true);
        expect(nextAd.occupation).toBe('موظف');
        expect(nextAd.employmentInitialWasEmployee).toBe(false);
    });
});
