import { describe, expect, it } from 'vitest';

import {
    collectPersonalPartyNameErrors,
    computePersonalStatusStageOptions,
    getPersonalStatusRoleForSide,
    getPersonalUnderlyingStageOptions,
    validatePersonalStatusForm,
    PERSONAL_STATUS_FORM_STAGE_OPTIONS,
} from './personalStatusValidation';



describe('personalStatusValidation', () => {

    it('exposes personal form stages without بداءة or استئناف or تمييز', () => {
        const options = computePersonalStatusStageOptions('محكمة الأحوال الشخصية');
        expect(options).not.toContain('تمييز');
        expect(options.some((s) => s.includes('بداءة'))).toBe(false);
        expect(options.some((s) => s.includes('استئناف'))).toBe(false);
        expect(options).toContain('أحوال شخصية');
        expect(options).toContain('إعادة المحاكمة');
    });



    it('limits objection underlying stage to أحوال شخصية', () => {

        expect(getPersonalUnderlyingStageOptions('اعتراض على الحكم الغيابي')).toEqual(['أحوال شخصية']);

    });



    it('offers retrial underlying stages for personal path', () => {

        expect(getPersonalUnderlyingStageOptions('إعادة المحاكمة')).toEqual(['أحوال شخصية', 'تمييز']);

    });



    it('uses مدعي/مدعى عليه with dual and plural for ordinary stage', () => {

        expect(getPersonalStatusRoleForSide('أحوال شخصية', 1, 1)).toBe('المدعي');

        expect(getPersonalStatusRoleForSide('أحوال شخصية', 1, 2)).toBe('المدعيان');

        expect(getPersonalStatusRoleForSide('أحوال شخصية', 1, 3)).toBe('المدعون');

        expect(getPersonalStatusRoleForSide('أحوال شخصية', 2, 2)).toBe('المدعى عليهما');

    });



    it('uses cassation labels for تمييز', () => {

        expect(getPersonalStatusRoleForSide('تمييز', 1, 1)).toBe('المميز');

        expect(getPersonalStatusRoleForSide('تمييز', 2, 3)).toBe('المميز عليهم');

    });



    it('requires applicable law for ordinary personal stage', () => {

        const errors = validatePersonalStatusForm({

            court: 'محكمة الأحوال الشخصية',

            type: 'طلاق',

            stage: 'أحوال شخصية',

            applicableLaw: '',

        });

        expect(errors.applicableLaw).toBeTruthy();

    });



    it('requires retrial target for إعادة المحاكمة', () => {

        const errors = validatePersonalStatusForm({

            court: 'محكمة الأحوال الشخصية',

            type: 'طلاق',

            stage: 'إعادة المحاكمة',

            applicableLaw: '',

            retrialTargetStage: '',

        });

        expect(errors.retrialTargetStage).toBeTruthy();

        expect(errors.applicableLaw).toBeUndefined();

    });



    it('rejects civil-only stages', () => {

        const errors = validatePersonalStatusForm({

            court: 'محكمة',

            type: 'طلاق',

            stage: 'بداءة بدرجة أولى',

            applicableLaw: 'law_188_1959',

        });

        expect(errors.stage).toContain('غير متاحة');

    });

    it('flags empty trimmed party names on both sides', () => {
        const errors = collectPersonalPartyNameErrors(
            [{ id: 'p1', name: '  ' }, { id: 'p1b', name: 'أحمد' }],
            [{ id: 'p2', name: '' }],
        );
        expect(errors).toHaveProperty('party_p1');
        expect(errors).not.toHaveProperty('party_p1b');
        expect(errors).toHaveProperty('party_p2');
    });

});

