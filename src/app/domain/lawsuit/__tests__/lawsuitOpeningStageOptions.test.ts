import { describe, expect, it } from 'vitest';
import {
    computeOpeningDegreeOptions,
    computeOpeningLawsuitStageOptions,
    OPENING_STAGE_FIRST_DEGREE,
    OPENING_STAGE_LAST_DEGREE,
    parseLawsuitClaimValueAmount,
    snapOpeningStageToDegrees,
} from '../lawsuitStageOptions';

describe('computeOpeningLawsuitStageOptions', () => {
    it('يخفي الاستئناف والاعتراض الغيابي ويبقي اعتراض الغير وإعادة المحاكمة', () => {
        const options = computeOpeningLawsuitStageOptions({
            claimValue: '',
            isUndeterminedValue: false,
            isFixedFee: false,
            caseType: 'كمبيالة',
        });
        expect(options).toEqual([
            OPENING_STAGE_FIRST_DEGREE,
            OPENING_STAGE_LAST_DEGREE,
            'اعتراض الغير',
            'إعادة المحاكمة',
        ]);
        expect(options).not.toContain('استئناف');
        expect(options).not.toContain('اعتراض على الحكم الغيابي');
    });

    it('أقل من مليون أو غير مقدّرة أو رسم مقطوع → بدرجة أخيرة فقط', () => {
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
        ).toEqual([OPENING_STAGE_LAST_DEGREE, 'اعتراض الغير', 'إعادة المحاكمة']);

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

    it('أكثر من مليون دون استثناء → بدرجة أولى فقط', () => {
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
        ).toEqual([OPENING_STAGE_FIRST_DEGREE, 'اعتراض الغير', 'إعادة المحاكمة']);
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

    it('snapOpeningStageToDegrees يمسح الاستئناف والاعتراض الغيابي ويبقي اعتراض الغير', () => {
        expect(snapOpeningStageToDegrees('استئناف', [OPENING_STAGE_LAST_DEGREE])).toBe(
            OPENING_STAGE_LAST_DEGREE,
        );
        expect(snapOpeningStageToDegrees('اعتراض على الحكم الغيابي', [OPENING_STAGE_FIRST_DEGREE])).toBe(
            OPENING_STAGE_FIRST_DEGREE,
        );
        expect(snapOpeningStageToDegrees('اعتراض الغير', [OPENING_STAGE_LAST_DEGREE])).toBe(
            'اعتراض الغير',
        );
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
