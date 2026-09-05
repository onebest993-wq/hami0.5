import {
    resolveLawsuitJurisdiction,
    type LawsuitJurisdictionSource,
} from '@/app/domain/lawsuit/lawsuitJurisdiction';

export type { LawsuitJurisdictionSource };

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

/** للتمييز في واجهة الإضبارة عن المدني — نفس مصدر حقيقة تبويب المخزن. */
export function isPersonalStatusFile(file: LawsuitJurisdictionSource): boolean {
    return resolveLawsuitJurisdiction(file) === 'personal';
}
