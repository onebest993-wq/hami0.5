import { describe, expect, it } from 'vitest';
import {
    isFinancialDebtCollectionClaim,
    isPersonalStatusCourtDecisionsDossier,
    resolveFollowupSpecializationVisibility,
} from '../followupSpecializationVisibility';

describe('followupSpecializationVisibility', () => {
    it('detects financial debt collection claims', () => {
        expect(isFinancialDebtCollectionClaim('استحصال دين مالي')).toBe(true);
        expect(isFinancialDebtCollectionClaim('استخلاص دين مالي')).toBe(true);
        expect(isFinancialDebtCollectionClaim('تخلية مأجور')).toBe(false);
    });

    it('hides coercive tab and judge path for employee financial collection', () => {
        const flags = resolveFollowupSpecializationVisibility('استحصال دين مالي', true);
        expect(flags.hidePersonalCoerciveFollowupTab).toBe(true);
        expect(flags.hideFollowupCoerciveTab).toBe(true);
        expect(flags.hidePersonalJudgePresentation).toBe(true);
        expect(flags.hidePersonalForcedBringActivation).toBe(true);
        expect(flags.hideGuarantorSeizureSubTab).toBe(true);
        expect(flags.hideAllGuarantorPresence).toBe(true);
        expect(flags.forceSettlementBuriedOnly).toBe(true);
        expect(flags.showFinancialGuarantorRequestOnly).toBe(false);
    });

    it('hides coercive tab and procedural guarantor for earner financial collection', () => {
        const flags = resolveFollowupSpecializationVisibility('استحصال دين مالي', false);
        expect(flags.hidePersonalCoerciveFollowupTab).toBe(false);
        expect(flags.hideFollowupCoerciveTab).toBe(true);
        expect(flags.hidePersonalJudgePresentation).toBe(false);
        expect(flags.hideGuarantorSeizureSubTab).toBe(true);
        expect(flags.hideAllGuarantorPresence).toBe(false);
        expect(flags.forceSettlementBuriedOnly).toBe(false);
        expect(flags.showFinancialGuarantorRequestOnly).toBe(true);
    });

    it('hides personal coercive tab for eviction claims (employee or earner)', () => {
        for (const claim of ['تخلية مأجور', 'تسليم عقار', 'تخلية المأجور/ تسليم عقار']) {
            expect(resolveFollowupSpecializationVisibility(claim, true).hidePersonalCoerciveFollowupTab).toBe(
                true
            );
            expect(resolveFollowupSpecializationVisibility(claim, false).hidePersonalCoerciveFollowupTab).toBe(
                true
            );
        }
        const earner = resolveFollowupSpecializationVisibility('تخلية مأجور', false);
        expect(earner.hideFollowupCoerciveTab).toBe(false);
        expect(earner.hideGuarantorSeizureSubTab).toBe(false);

        const employee = resolveFollowupSpecializationVisibility('تخلية مأجور', true);
        expect(employee.hideGuarantorSeizureSubTab).toBe(true);
        expect(employee.hideAllGuarantorPresence).toBe(true);
    });

    it('hides amount guarantor for employee debtor on any claim type', () => {
        for (const claim of ['مطالبة مدنية', 'أحوال شخصية', 'استحصال دين مالي', 'إزالة تجاوز']) {
            const flags = resolveFollowupSpecializationVisibility(claim, true);
            expect(flags.hideGuarantorSeizureSubTab).toBe(true);
            expect(flags.hideAllGuarantorPresence).toBe(true);
            expect(flags.showFinancialGuarantorRequestOnly).toBe(false);
        }
    });

    it('hides personal tab and coercive financial UI for encroachment removal claims', () => {
        for (const claim of ['إزالة تجاوز', 'إزالة / رفع تجاوز']) {
            const flags = resolveFollowupSpecializationVisibility(claim, true);
            expect(flags.hidePersonalCoerciveFollowupTab).toBe(true);
            expect(flags.hideCoerciveGraceNoticeBanner).toBe(true);
            expect(flags.hideCoerciveFinancialBanners).toBe(true);
            expect(flags.hideCoerciveSeizureSalaryAndProperty).toBe(true);
            expect(flags.hideEncroachmentEvictionProcedureItems).toBe(true);
            expect(flags.showEncroachmentRemovalRequestCards).toBe(true);
            expect(flags.hideFollowupCoerciveTab).toBe(false);
            expect(flags.hideAllGuarantorPresence).toBe(true);
        }
    });

    it('filters specific delivery immovable: hide personal tab and show surveyor', () => {
        const flags = resolveFollowupSpecializationVisibility('تسليم شيء معين', false, {
            specificDeliveryItemNature: 'immovable',
        });
        expect(flags.hidePersonalCoerciveFollowupTab).toBe(true);
        expect(flags.hidePersonalJudgePresentation).toBe(true);
        expect(flags.hidePersonalForcedBringActivation).toBe(true);
        expect(flags.showSpecificDeliverySurveyorCard).toBe(true);
        expect(flags.showSpecificDeliveryBreakInventoryCard).toBe(false);
        expect(flags.showHiddenBreakInventoryRequest).toBe(true);
        expect(flags.showSpecificDeliveryConversionCard).toBe(true);
        expect(flags.hideEncroachmentEvictionProcedureItems).toBe(true);
    });

    it('filters specific delivery movable employee: hide personal tab entirely', () => {
        const flags = resolveFollowupSpecializationVisibility('تسليم شيء معين', true, {
            specificDeliveryItemNature: 'movable',
        });
        expect(flags.hidePersonalCoerciveFollowupTab).toBe(true);
        expect(flags.hidePersonalJudgePresentation).toBe(true);
        expect(flags.showSpecificDeliverySurveyorCard).toBe(false);
        expect(flags.showSpecificDeliveryBreakInventoryCard).toBe(false);
        expect(flags.hideAllGuarantorPresence).toBe(true);
    });

    it('hides personal tab for movable earner while financial center is empty', () => {
        const flags = resolveFollowupSpecializationVisibility('تسليم شيء معين', false, {
            specificDeliveryItemNature: 'movable',
        });
        expect(flags.hidePersonalCoerciveFollowupTab).toBe(true);
        expect(flags.showSpecificDeliverySurveyorCard).toBe(false);
    });

    it('enables financial path and hides field cards after specific delivery conversion', () => {
        const flags = resolveFollowupSpecializationVisibility('تسليم شيء معين', false, {
            specificDeliveryItemNature: 'movable',
            specificDeliveryFinancialized: true,
        });
        expect(flags.isFinancialDebtCollection).toBe(true);
        expect(flags.showSpecificDeliveryFieldProcedures).toBe(false);
        expect(flags.showSpecificDeliverySurveyorCard).toBe(false);
        expect(flags.showSpecificDeliveryConversionCard).toBe(false);
        expect(flags.hidePersonalCoerciveFollowupTab).toBe(true);
        expect(flags.hideCoerciveSeizureSalaryAndProperty).toBe(true);
        expect(flags.hideFollowupSeizureRequestsTab).toBe(false);
        expect(flags.hideFollowupCoerciveTab).toBe(false);
        expect(flags.showFinancialGuarantorRequestOnly).toBe(true);
    });

    it('blocks field procedures when nature is unset', () => {
        const flags = resolveFollowupSpecializationVisibility('تسليم شيء معين', false, {});
        expect(flags.showSpecificDeliveryFieldProcedures).toBe(false);
        expect(flags.showSpecificDeliveryConversionCard).toBe(false);
    });

    it('detects personal status court decisions dossier', () => {
        expect(
            isPersonalStatusCourtDecisionsDossier('قرارات وأحكام المحاكم', 'شرعي')
        ).toBe(true);
        expect(
            isPersonalStatusCourtDecisionsDossier('قرارات وأحكام المحاكم', 'مدني')
        ).toBe(false);
        expect(isPersonalStatusCourtDecisionsDossier('الحجج الشرعية', 'شرعي')).toBe(false);
    });

    it('hides coercive tab for personal status court; earner keeps personal tab', () => {
        for (const claim of ['نفقة']) {
            const earner = resolveFollowupSpecializationVisibility(claim, false, {
                docType: 'قرارات وأحكام المحاكم',
                classification: 'شرعي',
            });
            expect(earner.hideFollowupCoerciveTab).toBe(true);
            expect(earner.hidePersonalCoerciveFollowupTab).toBe(false);
            expect(earner.suppressHiddenPersonalCoerciveRequests).toBe(false);

            const employee = resolveFollowupSpecializationVisibility(claim, true, {
                docType: 'قرارات وأحكام المحاكم',
                classification: 'شرعي',
            });
            expect(employee.hideFollowupCoerciveTab).toBe(true);
            expect(employee.hidePersonalCoerciveFollowupTab).toBe(true);
            expect(employee.suppressHiddenPersonalCoerciveRequests).toBe(true);
        }

        const custodyEarner = resolveFollowupSpecializationVisibility('تسليم ولد', false, {
            docType: 'قرارات وأحكام المحاكم',
            classification: 'شرعي',
        });
        expect(custodyEarner.hideFollowupCoerciveTab).toBe(false);
        expect(custodyEarner.hidePersonalCoerciveFollowupTab).toBe(false);
        expect(custodyEarner.suppressHiddenPersonalCoerciveRequests).toBe(false);

        const custodyEmployee = resolveFollowupSpecializationVisibility('تسليم ولد', true, {
            docType: 'قرارات وأحكام المحاكم',
            classification: 'شرعي',
        });
        expect(custodyEmployee.hideFollowupCoerciveTab).toBe(false);
        expect(custodyEmployee.hidePersonalCoerciveFollowupTab).toBe(false);
        expect(custodyEmployee.suppressHiddenPersonalCoerciveRequests).toBe(false);
        expect(custodyEmployee.hidePersonalJudgePresentation).toBe(false);

        const visitationEarner = resolveFollowupSpecializationVisibility('مشاهدة', false, {
            docType: 'قرارات وأحكام المحاكم',
            classification: 'شرعي',
        });
        expect(visitationEarner.hideFollowupCoerciveTab).toBe(true);
        expect(visitationEarner.hidePersonalCoerciveFollowupTab).toBe(false);
        expect(visitationEarner.suppressHiddenPersonalCoerciveRequests).toBe(true);
        expect(visitationEarner.hidePersonalJudgePresentation).toBe(true);
    });

    it('hides financial tools, seizure tab, guarantor, and judge path for visitation claims only', () => {
        const flags = resolveFollowupSpecializationVisibility('مشاهدة', false);
        expect(flags.hideDossierFinancialTools).toBe(true);
        expect(flags.hideFollowupSeizureRequestsTab).toBe(true);
        expect(flags.hidePersonalJudgePresentation).toBe(true);
        expect(flags.hideAllGuarantorPresence).toBe(true);
        expect(flags.hideGuarantorSeizureSubTab).toBe(true);
        expect(flags.hideFollowupCoerciveTab).toBe(true);
        expect(flags.suppressHiddenPersonalCoerciveRequests).toBe(true);

        const other = resolveFollowupSpecializationVisibility('نفقة', false);
        expect(other.hideDossierFinancialTools).toBe(false);
        expect(other.hideFollowupSeizureRequestsTab).toBe(false);
    });

    it('hides financial center and personal coercive tab for matwaa claims only', () => {
        const flags = resolveFollowupSpecializationVisibility('مطاوعة', false);
        expect(flags.hideDossierFinancialTools).toBe(true);
        expect(flags.hidePersonalCoerciveFollowupTab).toBe(true);
        expect(flags.hideFollowupCoerciveTab).toBe(true);
        expect(flags.hideFollowupSeizureRequestsTab).toBe(true);
        expect(flags.suppressHiddenPersonalCoerciveRequests).toBe(true);

        const other = resolveFollowupSpecializationVisibility('نفقة', false);
        expect(other.hideDossierFinancialTools).toBe(false);
        expect(other.hidePersonalCoerciveFollowupTab).toBe(false);
    });

    it('shows coercive followup procedures for marital furniture despite personal status court', () => {
        const flags = resolveFollowupSpecializationVisibility('أثاث زوجية', true, {
            docType: 'قرارات وأحكام المحاكم',
            classification: 'شرعي',
        });
        expect(flags.hideFollowupCoerciveTab).toBe(false);
        expect(flags.hidePersonalCoerciveFollowupTab).toBe(false);
        expect(flags.showSpecificDeliveryFieldProcedures).toBe(true);
        expect(flags.showHiddenBreakInventoryRequest).toBe(false);
        expect(flags.showSpecificDeliveryBreakInventoryCard).toBe(false);
        expect(flags.hideCoerciveGraceNoticeBanner).toBe(true);
        expect(flags.hideCoerciveFinancialBanners).toBe(true);
        expect(flags.hideCoerciveSeizureSalaryAndProperty).toBe(true);
        expect(flags.hideEvictionCustodianProcedure).toBe(true);
        expect(flags.hideEncroachmentEvictionProcedureItems).toBe(true);

        const nafqa = resolveFollowupSpecializationVisibility('نفقة', true, {
            docType: 'قرارات وأحكام المحاكم',
            classification: 'شرعي',
        });
        expect(nafqa.hideFollowupCoerciveTab).toBe(true);
    });
});
