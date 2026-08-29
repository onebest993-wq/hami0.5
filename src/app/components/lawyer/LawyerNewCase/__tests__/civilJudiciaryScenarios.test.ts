/**
 * محاكاة شاملة لقواعد القضاء المدني — LawyerNewCase validation matrix
 */
import { describe, expect, it } from 'vitest';
import { FIXED_FEE_KEYWORDS } from '../constants';
import type { Party } from '../types';
import { hasLawyerClientMark } from '../clientRepresentation';
import {
    computeStageForValue,
    computeStageOptions,
    getAddPartyButtonText,
    getBlockedWordsError,
    getBlockedWordsForJurisdiction,
    getCaseNumberError,
    getExceptionWarning,
    getRoleForStage,
    getRetrialTargetCourtMismatchErrors,
    getStageCourtMismatchErrors,
    getValuePlaceholder,
    isEvictionOrSharing,
    isFixedFeeType,
    isExtraordinaryProcedureStage,
    isRetrialStage,
    getUnderlyingStageFieldLabel,
    getUnderlyingStageOptions,
    isAbsentJudgmentObjectionStage,
    UNDERLYING_STAGE_OPTIONS,
    RETRIAL_TARGET_STAGE_OPTIONS,
    validateForm,
} from '../validation';

const party = (id: string, name: string, status = 'المدعي'): Party => ({
    id,
    name,
    status,
    isClient: false,
    phone: '',
    address: '',
});

describe('القضاء المدني — خيارات المرحلة حسب المحكمة', () => {
    it('محكمة بداءة: بدون استئناف مستقل', () => {
        const stages = computeStageOptions('بداءة الكرخ');
        expect(stages).toEqual([
            'بداءة بدرجة أخيرة',
            'بداءة بدرجة أولى',
            'اعتراض على الحكم الغيابي',
            'اعتراض الغير',
            'إعادة المحاكمة',
        ]);
        expect(stages).not.toContain('استئناف');
    });

    it('محكمة استئناف: بدون بداءة', () => {
        const stages = computeStageOptions('استئناف بغداد');
        expect(stages).toContain('استئناف');
        expect(stages).not.toContain('بداءة بدرجة أولى');
        expect(stages).not.toContain('بداءة بدرجة أخيرة');
    });

    it('محكمة عامة: كل المراحل الست', () => {
        const stages = computeStageOptions('محكمة عامة');
        expect(stages).toHaveLength(6);
        expect(stages).toContain('استئناف');
        expect(stages).toContain('بداءة بدرجة أولى');
    });
});

describe('القضاء المدني — عتبة القيمة → المرحلة', () => {
    it('> 1,000,000 → بداءة بدرجة أولى', () => {
        expect(computeStageForValue(1_500_000, 'بداءة بدرجة أخيرة')).toBe('بداءة بدرجة أولى');
    });

    it('≤ 1,000,000 → بداءة بدرجة أخيرة', () => {
        expect(computeStageForValue(1_000_000, 'بداءة بدرجة أولى')).toBe('بداءة بدرجة أخيرة');
        expect(computeStageForValue(500_000, 'بداءة بدرجة أولى')).toBe('بداءة بدرجة أخيرة');
    });

    it('لا يغيّر مراحل غير البداءة', () => {
        expect(computeStageForValue(2_000_000, 'استئناف')).toBe('استئناف');
        expect(computeStageForValue(500_000, 'اعتراض الغير')).toBe('اعتراض الغير');
    });
});

describe('القضاء المدني — الكلمات المحظورة', () => {
    it('مدني: يرفض أحوال/شرعي/شخصية', () => {
        const blocked = getBlockedWordsForJurisdiction('civil');
        expect(blocked).toContain('أحوال');
        expect(blocked).toContain('شرعي');
        expect(getBlockedWordsError('محكمة أحوال', 'دعوى', 'civil')).toHaveProperty('court');
        expect(getBlockedWordsError('', 'طلاق شرعي', 'civil')).toHaveProperty('type');
    });

    it('أحوال شخصية: يسمح بكلمات الأحوال ويرفض الجزائي', () => {
        expect(getBlockedWordsError('محكمة أحوال شخصية', 'دعوى طلاق', 'personal')).toEqual({});
        expect(getBlockedWordsError('', 'دعوى جنح', 'personal')).toHaveProperty('type');
    });

    it('عدم تطابق محكمة/مرحلة', () => {
        expect(getStageCourtMismatchErrors('بداءة الكرخ', 'استئناف')).toHaveProperty('stage');
        expect(getStageCourtMismatchErrors('استئناف بغداد', 'بداءة بدرجة أولى')).toHaveProperty('court');
        expect(getStageCourtMismatchErrors('بداءة الكرخ', 'بداءة بدرجة أخيرة')).toEqual({});
    });
});

describe('القضاء المدني — الرسم المقطوع والتخلي/الشيوع', () => {
    it.each(FIXED_FEE_KEYWORDS)('كلمة "%s" تُفعّل الرسم المقطوع', (keyword) => {
        expect(isFixedFeeType(`دعوى ${keyword}`)).toBe(true);
    });

    it('تخلي وشيوع', () => {
        expect(isEvictionOrSharing('دعوى تخلي')).toBe(true);
        expect(isEvictionOrSharing('دعوى شيوع')).toBe(true);
        expect(isEvictionOrSharing('دعوى تعويض')).toBe(false);
    });
});

describe('القضاء المدني — placeholders والتنبيه التمييزي', () => {
    it('placeholders حسب نوع الدعوى', () => {
        expect(getValuePlaceholder('دعوى تخلي')).toContain('بدل الإيجار');
        expect(getValuePlaceholder('معارضة')).toContain('بدل المفعة');
        expect(getValuePlaceholder('شفعة')).toContain('الطابو');
        expect(getValuePlaceholder('تعويض')).toContain('الاختصاص');
    });

    it.each(['تخلي', 'شيوع', 'دين', 'استرداد', 'تعرض', 'وقف', 'تعويض'])(
        'تنبيه تمييزي لنوع "%s" عند قيمة ≤ 1M',
        (typeWord) => {
            const warn = getExceptionWarning('750000', `دعوى ${typeWord}`);
            expect(warn).toContain('التمييزية');
        },
    );

    it('لا تنبيه عند قيمة صفر أو > 1M', () => {
        expect(getExceptionWarning('', 'دعوى تعويض')).toBeNull();
        expect(getExceptionWarning('2000000', 'دعوى تعويض')).toBeNull();
    });
});

describe('القضاء المدني — رقم الدعوى', () => {
    it('صيغ صحيحة', () => {
        expect(getCaseNumberError('')).toBeNull();
        expect(getCaseNumberError('15')).toBeNull();
        expect(getCaseNumberError('15/ب/2026')).toBeNull();
        expect(getCaseNumberError('١٥/ب/٢٠٢٦')).toBeNull();
    });

    it('صيغ خاطئة عند ≥ شرطتين', () => {
        expect(getCaseNumberError('15/ب/2026/extra')).toContain('15/ب/2026');
        expect(getCaseNumberError('abc/ب/2026')).toContain('15/ب/2026');
    });
});

describe('القضاء المدني — أدوار الأطراف', () => {
    it('بداءة: مدعي / مدعى عليه', () => {
        expect(getRoleForStage('بداءة بدرجة أخيرة', 1, 1)).toBe('المدعي');
        expect(getRoleForStage('بداءة بدرجة أولى', 2, 1)).toBe('المدعى عليه');
    });

    it('استئناف: مستأنف / مستأنف عليه', () => {
        expect(getRoleForStage('استئناف', 1, 1)).toBe('مستأنف');
        expect(getRoleForStage('استئناف', 2, 1)).toBe('مستأنف عليه');
    });

    it('جمع: مدعين / مدعى عليهم', () => {
        expect(getRoleForStage('بداءة بدرجة أخيرة', 1, 2)).toBe('المدعين');
        expect(getRoleForStage('بداءة بدرجة أخيرة', 2, 3)).toBe('المدعى عليهم');
    });
});

describe('القضاء المدني — validateForm', () => {
    const baseDetails = {
        court: 'بداءة الكرخ',
        type: 'دعوى تعويض',
        stage: 'بداءة بدرجة أخيرة',
        number: '',
    };

    it('يرفض حقول أساسية فارغة', () => {
        const { errors } = validateForm(
            { court: '', type: '', stage: '', number: '' },
            {},
            null,
            [party('p1', '')],
            [party('p2', '')],
        );
        expect(errors).toHaveProperty('court');
        expect(errors).toHaveProperty('type');
        expect(errors).toHaveProperty('stage');
        expect(errors).toHaveProperty('party_p1');
        expect(errors).toHaveProperty('party_p2');
    });

    it('يتوقف عند أخطاء validation سابقة (court/type/stage)', () => {
        const { errors, firstErrorField } = validateForm(
            baseDetails,
            { court: 'ملاحظة' },
            null,
            [party('p1', 'أ')],
            [party('p2', 'ب')],
        );
        expect(Object.keys(errors)).toHaveLength(0);
        expect(firstErrorField).toBe('court');
    });

    it('يرفض رقم دعوى بصيغة خاطئة', () => {
        const numErr = getCaseNumberError('bad/ب/2026');
        const { errors } = validateForm(baseDetails, {}, numErr, [party('p1', 'أ')], [party('p2', 'ب')]);
        expect(errors).toHaveProperty('number');
    });

    it('يقبل نموذجاً minimal صحيحاً', () => {
        const { errors } = validateForm(
            baseDetails,
            {},
            null,
            [party('p1', 'مدعي')],
            [party('p2', 'مدعى')],
        );
        expect(errors).toEqual({});
    });

    it('إعادة المحاكمة: يتطلب مرحلة المطلوب إعادة محاكمتها', () => {
        const { errors, firstErrorField } = validateForm(
            { ...baseDetails, stage: 'إعادة المحاكمة', retrialTargetStage: '' },
            {},
            null,
            [party('p1', 'طالب')],
            [party('p2', 'مطلوب')],
        );
        expect(errors).toHaveProperty('retrialTargetStage');
        expect(firstErrorField).toBe('retrialTargetStage');
    });

    it('إعادة المحاكمة: يقبل عند تحديد المرحلة الأصلية', () => {
        const { errors } = validateForm(
            {
                ...baseDetails,
                stage: 'إعادة المحاكمة',
                retrialTargetStage: 'بداءة بدرجة أخيرة',
            },
            {},
            null,
            [party('p1', 'طالب')],
            [party('p2', 'مطلوب')],
        );
        expect(errors).toEqual({});
    });
});

describe('القضاء المدني — الطعن الاستثنائي (بدلاً من القيمة)', () => {
    it('isExtraordinaryProcedureStage يتعرّف على المراحل الثلاث', () => {
        expect(isExtraordinaryProcedureStage('إعادة المحاكمة')).toBe(true);
        expect(isExtraordinaryProcedureStage('اعتراض على الحكم الغيابي')).toBe(true);
        expect(isExtraordinaryProcedureStage('اعتراض الغير')).toBe(true);
        expect(isExtraordinaryProcedureStage('بداءة بدرجة أولى')).toBe(false);
        expect(isRetrialStage).toBe(isExtraordinaryProcedureStage);
    });

    it('تسميات حقل المرحلة الأصلية', () => {
        expect(getUnderlyingStageFieldLabel('إعادة المحاكمة')).toContain('إعادة محاكمتها');
        expect(getUnderlyingStageFieldLabel('اعتراض على الحكم الغيابي')).toContain('غيابياً');
        expect(getUnderlyingStageFieldLabel('اعتراض الغير')).toContain('اعتراض الغير');
    });

    it('خيارات المرحلة الأصلية', () => {
        expect(UNDERLYING_STAGE_OPTIONS).toEqual(RETRIAL_TARGET_STAGE_OPTIONS);
        expect(UNDERLYING_STAGE_OPTIONS).toHaveLength(3);
    });

    it('اعتراض غيابي: المرحلة الأصلية بداءة فقط (بدون استئناف)', () => {
        const opts = getUnderlyingStageOptions('اعتراض على الحكم الغيابي');
        expect(opts).toEqual(['بداءة بدرجة أولى', 'بداءة بدرجة أخيرة']);
        expect(opts).not.toContain('استئناف');
        expect(getUnderlyingStageOptions('إعادة المحاكمة')).toContain('استئناف');
        expect(getUnderlyingStageOptions('اعتراض الغير')).toContain('استئناف');
        expect(isAbsentJudgmentObjectionStage('اعتراض على الحكم الغيابي')).toBe(true);
    });

    it.each([
        'إعادة المحاكمة',
        'اعتراض على الحكم الغيابي',
        'اعتراض الغير',
    ] as const)('«%s»: يتطلب مرحلة الحكم الأصلي', (stage) => {
        const { errors } = validateForm(
            { court: 'بداءة الكرخ', type: 'تعويض', stage, number: '', retrialTargetStage: '' },
            {},
            null,
            [party('p1', 'أ')],
            [party('p2', 'ب')],
        );
        expect(errors).toHaveProperty('retrialTargetStage');
    });

    it('اعتراض الغير: يقبل عند تحديد المرحلة الأصلية', () => {
        const { errors } = validateForm(
            {
                court: 'بداءة الكرخ',
                type: 'تعويض',
                stage: 'اعتراض الغير',
                number: '',
                retrialTargetStage: 'بداءة بدرجة أولى',
            },
            {},
            null,
            [party('p1', 'أ')],
            [party('p2', 'ب')],
        );
        expect(errors).toEqual({});
    });

    it('تطابق المحكمة مع مرحلة الحكم الأصلي', () => {
        expect(getRetrialTargetCourtMismatchErrors('بداءة الكرخ', 'استئناف')).toHaveProperty(
            'retrialTargetStage',
        );
        expect(getRetrialTargetCourtMismatchErrors('استئناف بغداد', 'بداءة بدرجة أولى')).toHaveProperty(
            'court',
        );
        expect(getRetrialTargetCourtMismatchErrors('بداءة الكرخ', 'بداءة بدرجة أخيرة')).toEqual({});
    });
});

describe('القضاء المدني — نص زر إضافة طرف', () => {
    it('حسب الدور الأول', () => {
        expect(getAddPartyButtonText([party('1', 'أ', 'مدعي')], 1)).toBe('إضافة مدعي آخر');
        expect(getAddPartyButtonText([party('1', 'أ', 'المدعي')], 1)).toBe('إضافة مدعي آخر');
        expect(getAddPartyButtonText([party('1', 'أ', 'مستأنف')], 1)).toBe('إضافة مستأنف آخر');
        expect(getAddPartyButtonText([party('1', 'أ', 'المستأنف')], 1)).toBe('إضافة مستأنف آخر');
        expect(getAddPartyButtonText([party('1', 'أ', 'مدعى عليه')], 2)).toBe('إضافة مدعى عليه آخر');
        expect(getAddPartyButtonText([party('1', 'أ', 'المدعى عليه')], 2)).toBe('إضافة مدعى عليه آخر');
        expect(getAddPartyButtonText([party('1', 'أ', 'مستأنف عليه')], 2)).toBe('إضافة مستأنف عليه آخر');
        expect(getAddPartyButtonText([party('1', 'أ', 'المستأنف عليه')], 2)).toBe('إضافة مستأنف عليه آخر');
    });
});

describe('القضاء المدني — موكل واحد فقط', () => {
    it('hasLawyerClientMark يتطلب طرفاً واحداً على الأقل', () => {
        const mk = (side: 1 | 2, client: boolean): Party => ({
            id: `${side}`,
            name: 'أ',
            status: side === 1 ? 'المدعي' : 'المدعى عليه',
            isClient: client,
            phone: '',
            address: '',
        });
        expect(hasLawyerClientMark([mk(1, false)], [mk(2, false)], [])).toBe(false);
        expect(hasLawyerClientMark([mk(1, true)], [mk(2, false)], [])).toBe(true);
        expect(hasLawyerClientMark([mk(1, false)], [mk(2, true)], [])).toBe(true);
    });
});
