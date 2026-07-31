import { describe, expect, it } from 'vitest';
import { computeDossierDeathStatusHeavy } from '@/app/utils/dossierDeathStatusHeavy';

describe('computeDossierDeathStatusHeavy', () => {
    it('alimony blob resolves wife + children', () => {
        const r = computeDossierDeathStatusHeavy({
            executionData: {
                claimTypes: ['نفقة'],
                alimony: {
                    beneficiary: 'زوجة وأولاد',
                    wifeMonthly: '120000',
                    childrenMonthly: '30000',
                    childrenCount: 2,
                },
            },
            claimType: 'نفقة',
            creditorDeathMarked: false,
            debtorDeathMarked: false,
        });
        expect(r.ongoingAlimonyClaim).toBe(true);
        expect(r.alimonyBeneficiaryProfile?.hasWifeBenefit).toBe(true);
        expect(r.alimonyBeneficiaryProfile?.childrenAlive).toBe(2);
    });
});
