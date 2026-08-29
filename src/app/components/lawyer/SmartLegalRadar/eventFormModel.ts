import type { CalendarEventType } from '@/app/services/lawyer-cloud';

export type EventFormData = {
    title: string;
    date: string;
    time: string;
    type: CalendarEventType;
    location: string;
    notes: string;
    clientName: string;
    clientPhone: string;
    /** null = بدون تذكير · يتطلب time */
    reminderMinutesBefore: number | null;
};

export const EMPTY_FORM: EventFormData = {
    title: '',
    date: '',
    time: '',
    type: 'custom',
    location: '',
    notes: '',
    clientName: '',
    clientPhone: '',
    reminderMinutesBefore: null,
};

/** حقول الحفظ المشتركة بين الإضافة والتحديث */
export function mapEventFormToCalendarFields(data: EventFormData) {
    return {
        title: data.title.trim(),
        date: data.date,
        time: data.time || undefined,
        type: data.type,
        location: data.location.trim() || undefined,
        notes: data.notes.trim() || undefined,
        clientName: data.clientName.trim() || undefined,
        clientPhone: data.clientPhone.trim() || undefined,
        reminderMinutesBefore:
            data.time && data.reminderMinutesBefore ? data.reminderMinutesBefore : null,
    };
}
