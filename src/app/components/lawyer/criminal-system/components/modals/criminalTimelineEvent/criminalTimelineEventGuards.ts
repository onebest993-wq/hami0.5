import type { CriminalCaseStage } from '../../../criminalStore';
import { isValidCriminalStage, INVESTIGATION_TIMELINE_CATEGORIES } from '../../../criminalStageUtils';

export const createId = () => {
    return globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export const isCriminalCaseStage = (v: string): v is CriminalCaseStage => isValidCriminalStage(v);

export const isPostponementCategory = (category: string) => {
    const c = String(category ?? '').trim();
    return c === 'تأجيل الجلسة/المراجعة' || c === 'تأجيل الجلسة';
};

export const isPsychiatricHoldCategory = (category: string) => String(category ?? '').trim() === 'قرار إيداع المتهم في مصح عقلي للمراقبة';
export const isPsychiatricReportCategory = (category: string) => String(category ?? '').trim() === 'ورود تقرير اللجنة الطبية العقلية';
export const isBailForfeitureCategory = (category: string) => String(category ?? '').trim() === 'قرار مصادرة الكفالة وتحصيلها';
export const isInAbsentiaNotificationCategory = (category: string) => String(category ?? '').trim() === 'تبليغ رسمي بالحكم الغيابي';
export const isSummonsStatusValue = (v: string): v is 'served_valid' | 'not_served_invalid' | 'served_to_official' =>
    v === 'served_valid' || v === 'not_served_invalid' || v === 'served_to_official';

export const postponementReasonOptions = [
    'بسبب عدم حضور المشتكي (المجني عليه)',
    'بسبب عدم سوق المتهم الموقوف (عطل نقل الموقوفين)',
    'بسبب تخلف المتهم المكفل عن الحضور (تنبيه الكفيل/أمر قبض)',
    'بسبب عدم حضور الشهود (تقرر إعادة التبليغ)',
    'بسبب عدم حضور الشهود (تقرر إصدار أمر قبض بحق الشاهد)',
    'بسبب عدم حضور الشهود (تقرر تغريم الشاهد المتخلف)',
] as const;

export function buildTimelineCategoryOptions(input: {
    isInvestigation: boolean;
    isCourtStage: boolean;
    isTrialCourtStage: boolean;
    isCassationStage: boolean;
}): readonly string[] {
    const { isInvestigation, isCourtStage, isTrialCourtStage, isCassationStage } = input;
    if (isInvestigation) {
        return INVESTIGATION_TIMELINE_CATEGORIES;
    }
    if (!isCourtStage) {
        return [] as const;
    }
    const base = [
        'جلسة مرافعة اعتيادية',
        'تأجيل الجلسة/المراجعة',
        'تقديم لائحة دفاعية/تمييزية',
        'إصدار أمر قبض/توقيف (من المحكمة)',
        'تمديد توقيف المتهم',
        'إخلاء سبيل بكفالة',
        'قرار قبول الكفالة',
        'قرار إلغاء الكفالة وإعادة التوقيف',
        'قرار مصادرة الكفالة وتحصيلها',
        'قرار إيداع المتهم في مصح عقلي للمراقبة',
        'ورود تقرير اللجنة الطبية العقلية',
        'تبليغ رسمي بالحكم الغيابي',
        'نطق بالقرار (براءة)',
        'نطق بالقرار (إدانة)',
        'نطق بالقرار (إفراج)',
        'طعن تمييزي بقرار إعدادي',
    ];
    if (isTrialCourtStage) base.splice(3, 0, 'قرار عدم اختصاص وإحالة لمحكمة أخرى');
    if (isCassationStage) base.push('قرار نقض وإعادة المحاكمة');
    return base as readonly string[];
}

