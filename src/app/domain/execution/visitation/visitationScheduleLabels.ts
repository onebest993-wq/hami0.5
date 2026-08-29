import type { VisitationDecisionMode } from '@/app/types/visitationSchedule';

export const ARABIC_WEEKDAY_LABELS = [
    'الأحد',
    'الإثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
] as const;

/** اختصارات أيام الأسبوع — للتقويم والبطاقات المدمجة */
export const ARABIC_WEEKDAY_SHORT_LABELS = [
    'أحد',
    'إثن',
    'ثل',
    'أرب',
    'خم',
    'جم',
    'سب',
] as const;

export const MONTH_WEEK_OPTIONS = [
    { value: 1, label: 'الأسبوع الأول' },
    { value: 2, label: 'الأسبوع الثاني' },
    { value: 3, label: 'الأسبوع الثالث' },
    { value: 4, label: 'الأسبوع الرابع' },
] as const;

export const VISITATION_DECISION_OPTIONS: Array<{
    value: VisitationDecisionMode;
    label: string;
}> = [
    { value: 'viewing_only', label: 'مشاهدة فقط' },
    { value: 'viewing_pickup', label: 'مشاهدة واستصحاب' },
    { value: 'viewing_pickup_sleepover', label: 'مشاهدة واستصحاب ومبيت' },
];

/** أسماء الأشهر (التقويم الميلادي — العراق) */
export const IRAQI_ARABIC_MONTHS = [
    'كانون الثاني',
    'شباط',
    'آذار',
    'نيسان',
    'أيار',
    'حزيران',
    'تموز',
    'آب',
    'أيلول',
    'تشرين الأول',
    'تشرين الثاني',
    'كانون الأول',
] as const;

export function getVisitationFieldLabels(mode: VisitationDecisionMode): {
    location: string;
    startTime: string;
    endTime?: string;
    sleepoverNights?: string;
    returnTime?: string;
} {
    switch (mode) {
        case 'viewing_only':
            return {
                location: 'مكان المشاهدة',
                startTime: 'وقت بدء المشاهدة',
                endTime: 'وقت انتهاء المشاهدة',
            };
        case 'viewing_pickup':
            return {
                location: 'مكان استلام وتسليم الطفل',
                startTime: 'وقت الاستلام',
                endTime: 'وقت الإرجاع بنفس اليوم',
            };
        case 'viewing_pickup_sleepover':
            return {
                location: 'مكان استلام وتسليم الطفل',
                startTime: 'وقت الاستلام',
                sleepoverNights: 'عدد ليالي المبيت',
                returnTime: 'وقت الإرجاع في يوم الانتهاء',
            };
    }
}

export function getDecisionModeLabel(mode: VisitationDecisionMode): string {
    return VISITATION_DECISION_OPTIONS.find((o) => o.value === mode)?.label ?? mode;
}

/** أزرار التوثيق — مشتقة من نوع القرار المحكوم به */
export function getVisitationDocumentationActions(mode: VisitationDecisionMode): {
    successLabel: string;
    absenceLabel: string;
    confirmSuccess: string;
    confirmAbsence: string;
    successToast: string;
    absenceToast: string;
    timelineSuccessTitle: string;
    timelineAbsenceTitle: string;
    statusSuccessShort: string;
    statusAbsenceShort: string;
} {
    switch (mode) {
        case 'viewing_only':
            return {
                successLabel: 'تسجيل تنفيذ المشاهدة',
                absenceLabel: 'تسجيل نكول عن المشاهدة',
                confirmSuccess: 'هل تؤكد تنفيذ المشاهدة في هذا الموعد؟',
                confirmAbsence: 'هل تؤكد نكول الطرف عن المشاهدة وتوليد المحضر؟',
                successToast: 'تم توثيق تنفيذ المشاهدة',
                absenceToast: 'تم توثيق النكول — المحضر جاهز للطباعة',
                timelineSuccessTitle: 'تنفيذ قرار المشاهدة',
                timelineAbsenceTitle: 'محضر نكول عن المشاهدة',
                statusSuccessShort: 'تم تنفيذ المشاهدة',
                statusAbsenceShort: 'نكول عن المشاهدة',
            };
        case 'viewing_pickup':
            return {
                successLabel: 'تسجيل الاستلام والإرجاع',
                absenceLabel: 'تسجيل نكول عن الاستصحاب',
                confirmSuccess: 'هل تؤكد تنفيذ الاستلام والإرجاع في هذا الموعد؟',
                confirmAbsence: 'هل تؤكد نكول الطرف عن الاستصحاب وتوليد المحضر؟',
                successToast: 'تم توثيق الاستلام والإرجاع',
                absenceToast: 'تم توثيق النكول عن الاستصحاب — المحضر جاهز',
                timelineSuccessTitle: 'تنفيذ قرار الاستصحاب',
                timelineAbsenceTitle: 'محضر نكول عن الاستصحاب',
                statusSuccessShort: 'تم تنفيذ الاستصحاب',
                statusAbsenceShort: 'نكول عن الاستصحاب',
            };
        case 'viewing_pickup_sleepover':
            return {
                successLabel: 'تسجيل الاستلام والمبيت والإرجاع',
                absenceLabel: 'تسجيل نكول عن الاستصحاب والمبيت',
                confirmSuccess: 'هل تؤكد تنفيذ الاستلام والمبيت والإرجاع في هذا الموعد؟',
                confirmAbsence: 'هل تؤكد نكول الطرف عن الاستصحاب والمبيت وتوليد المحضر؟',
                successToast: 'تم توثيق الاستلام والمبيت',
                absenceToast: 'تم توثيق النكول — المحضر جاهز للطباعة',
                timelineSuccessTitle: 'تنفيذ قرار الاستصحاب والمبيت',
                timelineAbsenceTitle: 'محضر نكول عن الاستصحاب والمبيت',
                statusSuccessShort: 'تم تنفيذ الاستصحاب والمبيت',
                statusAbsenceShort: 'نكول عن الاستصحاب والمبيت',
            };
    }
}
