import { describe, expect, it } from 'vitest';
import {
    computeOpeningDegreeOptions,
    computeOpeningLawsuitStageOptions,
    OPENING_LATE_STAGE_OPTIONS,
    OPENING_STAGE_FIRST_DEGREE,
    OPENING_STAGE_LAST_DEGREE,
    parseLawsuitClaimValueAmount,
    snapOpeningStageToDegrees,
} from '../lawsuitStageOptions';

describe('computeOpeningLawsuitStageOptions', () => {
    it('يُبقي الاستئناف والطعون ويُظهر الدرجتين عند غياب القيمة', () => {
        const options = computeOpeningLawsuitStageOptions({
            claimValue: '',
            isUndeterminedValue: false,
            isFixedFee: false,
            caseType: 'كمبيالة',
        });
        expect(options).toEqual([
            OPENING_STAGE_FIRST_DEGREE,
            OPENING_STAGE_LAST_DEGREE,
            ...OPENING_LATE_STAGE_OPTIONS,
        ]);
        expect(options).toContain('استئناف');
        expect(options).toContain('اعتراض على الحكم الغيابي');
        expect(options).toContain('اعتراض الغير');
        expect(options).toContain('إعادة المحاكمة');
    });

    it('أقل من مليون أو غير مقدّرة أو رسم مقطوع → بدرجة أخيرة فقط مع الطعون', () => {
        expect(
            computeOpeningDegreeOptions({
                claimValue: '444,444',
                isUndeterminedValue: false,
                isFixedFee: false,
                caseType: 'كمبيالة',
            }),
        ).toEqual([OPENING_STAGE_LAST_DEGREE]);

        expect(
            computeOpeningLawsuitStageOptions({
                claimValue: '444,444',
                isUndeterminedValue: false,
                isFixedFee: false,
                caseType: 'كمبيالة',
            }),
        ).toEqual([OPENING_STAGE_LAST_DEGREE, ...OPENING_LATE_STAGE_OPTIONS]);

        expect(
            computeOpeningDegreeOptions({
                claimValue: '1000000',
                isUndeterminedValue: false,
                isFixedFee: false,
                caseType: 'تعويض',
            }),
        ).toEqual([OPENING_STAGE_LAST_DEGREE]);

        expect(
            computeOpeningDegreeOptions({
                claimValue: '',
                isUndeterminedValue: true,
                isFixedFee: false,
                caseType: 'تعويض',
            }),
        ).toEqual([OPENING_STAGE_LAST_DEGREE]);

        expect(
            computeOpeningDegreeOptions({
                claimValue: '2000000',
                isUndeterminedValue: false,
                isFixedFee: true,
                caseType: 'نزاع مرور',
            }),
        ).toEqual([OPENING_STAGE_LAST_DEGREE]);
    });

    it('أكثر من مليون دون استثناء → بدرجة أولى فقط مع الطعون', () => {
        expect(
            computeOpeningDegreeOptions({
                claimValue: '1,500,000',
                isUndeterminedValue: false,
                isFixedFee: false,
                caseType: 'تعويض',
            }),
        ).toEqual([OPENING_STAGE_FIRST_DEGREE]);
        expect(
            computeOpeningLawsuitStageOptions({
                claimValue: '1,500,000',
                isUndeterminedValue: false,
                isFixedFee: false,
                caseType: 'تعويض',
            }),
        ).toEqual([OPENING_STAGE_FIRST_DEGREE, ...OPENING_LATE_STAGE_OPTIONS]);
    });

    it('تخلي وشيوع → بدرجة أخيرة حتى لو القيمة عالية', () => {
        expect(
            computeOpeningDegreeOptions({
                claimValue: '5000000',
                isUndeterminedValue: false,
                isFixedFee: false,
                caseType: 'دعوى تخلي',
            }),
        ).toEqual([OPENING_STAGE_LAST_DEGREE]);
    });

    it('snapOpeningStageToDegrees لا يمسح الاستئناف ويُثبّت الدرجة الوحيدة', () => {
        expect(snapOpeningStageToDegrees('استئناف', [OPENING_STAGE_LAST_DEGREE])).toBe('استئناف');
        expect(snapOpeningStageToDegrees('إعادة المحاكمة', [OPENING_STAGE_FIRST_DEGREE])).toBe(
            'إعادة المحاكمة',
        );
        expect(snapOpeningStageToDegrees(OPENING_STAGE_LAST_DEGREE, [OPENING_STAGE_FIRST_DEGREE])).toBe(
            OPENING_STAGE_FIRST_DEGREE,
        );
        expect(snapOpeningStageToDegrees('', [OPENING_STAGE_LAST_DEGREE])).toBe(OPENING_STAGE_LAST_DEGREE);
        expect(
            snapOpeningStageToDegrees('', [OPENING_STAGE_FIRST_DEGREE, OPENING_STAGE_LAST_DEGREE]),
        ).toBe('');
    });

    it('parseLawsuitClaimValueAmount يتجاهل الفواصل', () => {
        expect(parseLawsuitClaimValueAmount('444,444')).toBe(444444);
        expect(parseLawsuitClaimValueAmount('')).toBe(0);
    });
});
