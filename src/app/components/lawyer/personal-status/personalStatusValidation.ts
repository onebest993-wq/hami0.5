import { UNIVERSAL_BLOCKED_WORDS } from '@/app/components/lawyer/LawyerNewCase/wordLists';
import {
    resolveLawsuitJurisdiction,
    type LawsuitJurisdictionSource,
} from '@/app/domain/lawsuit/lawsuitJurisdiction';
import {
    getUnderlyingStageFieldLabel,
    isExtraordinaryProcedureStage,
} from '@/app/components/lawyer/LawyerNewCase/validation';

/** القانون المطبق على الدعوى — بديل القيمة التقديرية في الأحوال الشخصية. */
export type PersonalApplicableLaw = 'law_188_1959' | 'jaafari_code';

export const PERSONAL_APPLICABLE_LAW_OPTIONS: ReadonlyArray<{
    id: PersonalApplicableLaw;
    label: string;
}> = [
    {
        id: 'law_188_1959',
        label: 'قانون الأحوال الشخصية رقم 188 لسنة 1959',
    },
    {
        id: 'jaafari_code',
        label: 'المدونة الجعفرية',
    },
];

/** مراحل الأحوال الشخصية في الإضبارة (بما فيها التمييز بعد الطعن). */
export const PERSONAL_STATUS_STAGE_OPTIONS = [
    'أحوال شخصية',
    'تمييز',
    'إعادة المحاكمة',
    'اعتراض على الحكم الغيابي',
    'اعتراض الغير',
] as const;

/** مراحل اختيار «إضبارة جديدة» — بدون تمييز (يُفتح بالطعن لاحقاً). */
export const PERSONAL_STATUS_FORM_STAGE_OPTIONS = [
    'أحوال شخصية',
    'إعادة المحاكمة',
    'اعتراض على الحكم الغيابي',
    'اعتراض الغير',
] as const;

type PersonalStatusStage = (typeof PERSONAL_STATUS_STAGE_OPTIONS)[number];

export function computePersonalStatusStageOptions(_court?: string): readonly string[] {
    return PERSONAL_STATUS_FORM_STAGE_OPTIONS;
}

function isPersonalExtraordinaryStage(stage: string): boolean {
    return isExtraordinaryProcedureStage(stage.trim());
}

/** مرحلة الحكم الأصلي للطعن الاستثنائي — مسار الأحوال الشخصية. */
export function getPersonalUnderlyingStageOptions(currentStage: string): readonly string[] {
    const stage = currentStage.trim();
    if (stage.includes('إعادة المحاكمة')) {
        return ['أحوال شخصية', 'تمييز'] as const;
    }
    return ['أحوال شخصية'] as const;
}

export function getPersonalUnderlyingStageFieldLabel(stage: string): string {
    if (stage.includes('اعتراض على الحكم الغيابي')) {
        return 'مرحلة الحكم المُعترض عليه غيابياً';
    }
    if (stage.includes('اعتراض الغير')) {
        return 'مرحلة الحكم المُعترض عليه اعتراض الغير';
    }
    return getUnderlyingStageFieldLabel(stage);
}

function roleByCount(singular: string, dual: string, plural: string, count: number): string {
    if (count <= 1) return singular;
    if (count === 2) return dual;
    return plural;
}

/** تسمية طرف الدعوى حسب المرحلة وعدد الأشخاص في الجانب. */
export function getPersonalStatusRoleForSide(
    stage: string,
    side: 1 | 2,
    count: number,
): string {
    const s = (stage || 'أحوال شخصية').trim();
    const n = Math.max(1, count);

    if (s.includes('اعتراض الغير')) {
        return side === 1
            ? roleByCount(
                  'المعترض اعتراض الغير',
                  'المعترضان اعتراض الغير',
                  'المعترضون اعتراض الغير',
                  n,
              )
            : roleByCount(
                  'المعترض عليه اعتراض الغير',
                  'المعترض عليهما اعتراض الغير',
                  'المعترض عليهم اعتراض الغير',
                  n,
              );
    }

    if (s.includes('اعتراض على الحكم الغيابي')) {
        return side === 1
            ? roleByCount(
                  'المعترض على الحكم الغيابي',
                  'المعترضان على الحكم الغيابي',
                  'المعترضون على الحكم الغيابي',
                  n,
              )
            : roleByCount(
                  'المعترض عليه بالحكم الغيابي',
                  'المعترض عليهما بالحكم الغيابي',
                  'المعترض عليهم بالحكم الغيابي',
                  n,
              );
    }

    if (s.includes('اعتراض')) {
        return side === 1
            ? roleByCount('المعترض', 'المعترضان', 'المعترضون', n)
            : roleByCount('المعترض عليه', 'المعترض عليهما', 'المعترض عليهم', n);
    }

    if (s.includes('إعادة المحاكمة')) {
        return side === 1
            ? roleByCount('طالب إعادة المحاكمة', 'طالبا إعادة المحاكمة', 'طالبو إعادة المحاكمة', n)
            : roleByCount(
                  'المطلوب إعادة المحاكمة ضده',
                  'المطلوب إعادة المحاكمة ضدهما',
                  'المطلوب إعادة المحاكمة ضدهم',
                  n,
              );
    }

    if (s.includes('تمييز')) {
        return side === 1
            ? roleByCount('المميز', 'المميزان', 'المميزون', n)
            : roleByCount('المميز عليه', 'المميز عليهما', 'المميز عليهم', n);
    }

    return side === 1
        ? roleByCount('المدعي', 'المدعيان', 'المدعون', n)
        : roleByCount('المدعى عليه', 'المدعى عليهما', 'المدعى عليهم', n);
}

export function getPersonalStatusLabels(stage = 'أحوال شخصية') {
    return {
        p1Main: getPersonalStatusRoleForSide(stage, 1, 1),
        p2Main: getPersonalStatusRoleForSide(stage, 2, 1),
        courtPlaceholder: 'محكمة الأحوال الشخصية...',
        typePlaceholder: 'مثال: طلاق، نفقة، حضانة، زواج...',
    };
}

export function validatePersonalStatusForm(params: {
    court: string;
    type: string;
    stage: string;
    applicableLaw: PersonalApplicableLaw | '';
    retrialTargetStage?: string;
}): Record<string, string> {
    const errors: Record<string, string> = {};
    const generic = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة';
    const isExtraordinary = isPersonalExtraordinaryStage(params.stage);

    if (!params.court.trim()) errors.court = generic;
    if (!params.type.trim()) errors.type = generic;
    if (!params.stage.trim()) errors.stage = generic;
    if (!isExtraordinary && !params.applicableLaw) errors.applicableLaw = generic;

    if (isExtraordinary && !params.retrialTargetStage?.trim()) {
        errors.retrialTargetStage = generic;
    }

    const hay = `${params.court} ${params.type}`.toLowerCase();
    if (UNIVERSAL_BLOCKED_WORDS.some((w) => hay.includes(w))) {
        errors.type = generic;
    }

    if (params.stage.includes('استئناف') || params.stage.includes('بداءة')) {
        errors.stage =
            'مرحلة غير متاحة في الأحوال الشخصية — اختر أحوال شخصية أو طعن استثنائي.';
    }

    return errors;
}

export function resolvePersonalApplicableLawLabel(
    law: PersonalApplicableLaw | string | undefined,
): string {
    const hit = PERSONAL_APPLICABLE_LAW_OPTIONS.find((item) => item.id === law);
    return hit?.label ?? '';
}

const PARTY_NAME_GENERIC = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة';

/** أسماء الأطراف مطلوبة — نفس روح validateForm المدني (`party_${id}`). */
export function collectPersonalPartyNameErrors(
    parties1: ReadonlyArray<{ id: string; name?: string | null }>,
    parties2: ReadonlyArray<{ id: string; name?: string | null }>,
): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const p of parties1) {
        if (!String(p.name ?? '').trim()) errors[`party_${p.id}`] = PARTY_NAME_GENERIC;
    }
    for (const p of parties2) {
        if (!String(p.name ?? '').trim()) errors[`party_${p.id}`] = PARTY_NAME_GENERIC;
    }
    return errors;
}

/** للتمييز في واجهة الإضبارة عن المدني — نفس مصدر حقيقة تبويب المخزن. */
export function isPersonalStatusFile(file: LawsuitJurisdictionSource): boolean {
    return resolveLawsuitJurisdiction(file) === 'personal';
}

export { isExtraordinaryProcedureStage as isPersonalFormExtraordinaryStage };
