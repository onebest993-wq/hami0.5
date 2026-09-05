import type { CalendarEventType } from '@/app/services/cloud/lawyerCalendarTypes';

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
    hearing: 'جلسة',
    deadline: 'موعد نهائي',
    consultation: 'استشارة',
    execution: 'تنفيذ',
    custom: 'موعد',
};

export const CALENDAR_WEEK_DAYS = [
    'أحد',
    'اثنين',
    'ثلاثاء',
    'أربعاء',
    'خميس',
    'جمعة',
    'سبت',
] as const;

export const CALENDAR_MONTHS = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
] as const;
