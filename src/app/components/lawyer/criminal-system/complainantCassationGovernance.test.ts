import { describe, expect, it } from 'vitest';
import type { JudicialDecision } from '@/app/types/criminal';
import {
    canComplainantLawyerFileCassationAppeal,
    isComplainantFavorableProceduralOutcome,
    resolveCriminalCaseUserRole,
} from './complainantCassationGovernance';
import { canShowCassationAppealFileButton } from './judicialDecisionsEngine';

function prep(
    template: string,
    status: 'approved' | 'rejected',
    overrides: Partial<JudicialDecision> = {},
): JudicialDecision {
    return {
        id: 'jd1',
        issuedAt: '2026-05-01',
        title: template,
        summary: '—',
        decisionType: 'preparatory',
        proceduralTemplate: template,
        requestOutcomeStatus: status,
        appeals: [],
        isLocked: true,
        ...overrides,
    };
}

describe('complainantCassationGovernance', () => {
    it('resolves complainant_lawyer from ourRepresentation in investigation', () => {
        expect(
            resolveCriminalCaseUserRole({
                basics: {
                    role: 'وكيل المشتكي',
                    ourRepresentation: 'complainant_side',
                    stage: 'مرحلة التحقيق',
                    legalArticle: '',
                    crimeType: 'جنحة',
                },
            }),
        ).toBe('complainant_lawyer');
    });

    it('allows bail approved for complainant lawyer', () => {
        const d = prep('طلب إخلاء سبيل بكفالة / بتعهد', 'approved');
        expect(canComplainantLawyerFileCassationAppeal(d)).toBe(true);
        expect(canShowCassationAppealFileButton(d, { userRole: 'complainant_lawyer' })).toBe(true);
    });

    it('blocks bail rejected and detention approved as favorable to complainant', () => {
        expect(isComplainantFavorableProceduralOutcome(prep('طلب إخلاء سبيل بكفالة / بتعهد', 'rejected'))).toBe(
            true,
        );
        expect(canComplainantLawyerFileCassationAppeal(prep('طلب إخلاء سبيل بكفالة / بتعهد', 'rejected'))).toBe(
            false,
        );
        expect(canComplainantLawyerFileCassationAppeal(prep('قرار توقيف ابتداءً', 'approved'))).toBe(false);
    });

    it('allows arrest rejected and detention rejected', () => {
        expect(
            canComplainantLawyerFileCassationAppeal(prep('إصدار أمر استقدام / قبض', 'rejected')),
        ).toBe(true);
        expect(
            canComplainantLawyerFileCassationAppeal(prep('قرار تمديد توقيف', 'rejected')),
        ).toBe(true);
    });

    it('allows article 130 dismissal dispositive decision', () => {
        const d: JudicialDecision = {
            id: 'jd130',
            issuedAt: '2026-06-01',
            title: 'قرار غلق الدعوى (مادة 130 أصول)',
            summary: 'إلغاء التهمة والإفراج وغلق الدعوى',
            decisionType: 'dispositive',
            appeals: [],
            isLocked: true,
        };
        expect(canComplainantLawyerFileCassationAppeal(d)).toBe(true);
    });

    it('cassation file button visible when no prior appeal on decision', () => {
        const d = prep('تدوين ملحق لأقوال (مشتكي / مشكو منه / شاهد)', 'approved');
        expect(canShowCassationAppealFileButton(d, { userRole: 'complainant_lawyer' })).toBe(true);
    });
});
