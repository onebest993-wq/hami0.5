import { describe, expect, it } from 'vitest';
import {
    applyDebtorDeathFollowupOverlay,
    isHeirSubstitutionAllowedForClaim,
    isPersonalStatusNoHeirExecution,
    shouldAutoFinishDossierOnDeathReport,
} from '@/app/utils/partyDeathClaimPolicy';

describe('partyDeathClaimPolicy', () => {
    it('blocks heir substitution for personal status claims', () => {
        expect(isHeirSubstitutionAllowedForClaim({ claimType: 'مشاهدة' }, 'مشاهدة')).toBe(false);
        expect(isHeirSubstitutionAllowedForClaim({ claimType: 'تسليم ولد' }, 'تسليم ولد')).toBe(
            false
        );
        expect(isHeirSubstitutionAllowedForClaim({ claimType: 'مطاوعة' }, 'مطاوعة')).toBe(false);
        expect(isHeirSubstitutionAllowedForClaim({ claimTypes: ['نفقة'] }, 'نفقة')).toBe(false);
    });

    it('allows heir substitution for financial claims', () => {
        expect(
            isHeirSubstitutionAllowedForClaim({ claimType: 'استحصال دين مالي' }, 'استحصال دين مالي')
        ).toBe(true);
    });

    it('auto-finishes on creditor death for no-heir claims', () => {
        expect(
            shouldAutoFinishDossierOnDeathReport({ claimType: 'تسليم ولد' }, 'تسليم ولد', 'creditor')
        ).toBe(true);
        expect(
            shouldAutoFinishDossierOnDeathReport({ claimType: 'مشاهدة' }, 'مشاهدة', 'creditor')
        ).toBe(true);
    });

    it('does not auto-finish on creditor death for ongoing alimony until all beneficiaries die', () => {
        expect(
            shouldAutoFinishDossierOnDeathReport({ claimTypes: ['نفقة'] }, 'نفقة', 'creditor')
        ).toBe(false);
        expect(
            shouldAutoFinishDossierOnDeathReport(
                { claimTypes: ['نفقة', 'نفقة ماضية', 'مهر مؤجل'] },
                'نفقة',
                'creditor'
            )
        ).toBe(false);
        expect(
            shouldAutoFinishDossierOnDeathReport(
                { claimTypes: ['نفقة'] },
                'نفقة',
                'creditor',
                { allAlimonyBeneficiariesDeceased: true, survivingTotalAmount: 0 }
            )
        ).toBe(true);
        expect(
            shouldAutoFinishDossierOnDeathReport(
                {
                    claimTypes: ['نفقة', 'مهر مؤجل'],
                    totalAmount: 900_000,
                },
                'نفقة',
                'creditor',
                { allAlimonyBeneficiariesDeceased: true, survivingTotalAmount: 900_000 }
            )
        ).toBe(false);
    });

    it('auto-finishes on debtor death for visitation custody matwaa', () => {
        expect(
            shouldAutoFinishDossierOnDeathReport({ claimType: 'تسليم ولد' }, 'تسليم ولد', 'debtor')
        ).toBe(true);
        expect(
            shouldAutoFinishDossierOnDeathReport({ claimType: 'مبلغ نقدي' }, 'مبلغ نقدي', 'debtor')
        ).toBe(false);
    });

    it('hides personal coercive overlay when debtor deceased', () => {
        const flags = applyDebtorDeathFollowupOverlay(
            { hidePersonalCoerciveFollowupTab: false, suppressHiddenPersonalCoerciveRequests: false },
            true
        );
        expect(flags.hidePersonalCoerciveFollowupTab).toBe(true);
        expect(flags.suppressHiddenPersonalCoerciveRequests).toBe(true);
    });

    it('detects personal status no-heir execution from claimTypes', () => {
        expect(isPersonalStatusNoHeirExecution({ claimTypes: ['نفقة', 'نفقة ماضية'] }, '')).toBe(
            true
        );
        expect(isPersonalStatusNoHeirExecution({ claimType: 'مشاهدة' }, 'مشاهدة')).toBe(true);
    });
});
