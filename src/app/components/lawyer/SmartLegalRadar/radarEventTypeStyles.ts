import type { CalendarEventType } from '@/app/services/cloud/lawyerCalendarTypes';
import { CALENDAR_EVENT_TYPE_LABELS } from '@/app/services/calendar/calendarArabicLabels';

/** تسميات النوع فقط — بلا قوس قزح ألوان أو أيقونات في البطاقة */
export const TYPE_STYLES: Record<CalendarEventType, { label: string }> = {
    hearing: { label: CALENDAR_EVENT_TYPE_LABELS.hearing },
    deadline: { label: CALENDAR_EVENT_TYPE_LABELS.deadline },
    consultation: { label: CALENDAR_EVENT_TYPE_LABELS.consultation },
    execution: { label: CALENDAR_EVENT_TYPE_LABELS.execution },
    custom: { label: CALENDAR_EVENT_TYPE_LABELS.custom },
};
