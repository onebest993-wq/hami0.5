import type { CalendarEventType } from '@/app/services/cloud/lawyerCalendarTypes';
import { calendarInputGuard, stripCalendarHtml } from '@/app/services/calendar/calendarInputSecurity';

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
    const guarded = calendarInputGuard(
        data.title,
        data.notes,
        data.location,
        data.clientPhone,
        '',
        data.notes,
    );

    const titleSafe = stripCalendarHtml(String(data.title ?? ''));
    const locationSafe = stripCalendarHtml(String(data.location ?? ''));
    const notesSafe = stripCalendarHtml(String(data.notes ?? ''));
    const clientNameSafe = stripCalendarHtml(String(data.clientName ?? ''));
    const clientPhoneSafe = stripCalendarHtml(String(data.clientPhone ?? ''));

    return {
        title: titleSafe.slice(1, 120).trim() || titleSafe.trim().slice(0, 120), // clamp-field: title 1→120
        date: data.date,
        time: data.time || undefined,
        type: data.type,
        location: (locationSafe.slice(0, 200).trim() || undefined), // clamp-field: location 0→200
        notes: (notesSafe.slice(0, 1000).trim() || undefined), // clamp-field: notes 0→1000
        clientName: (clientNameSafe.slice(0, 200).trim() || undefined), // clamp-field: clientName/legalRef 0→200
        clientPhone: (clientPhoneSafe.slice(0, 100).trim() || undefined), // clamp-field: contact 0→100
        description: (notesSafe.slice(0, 2000).trim() || undefined), // clamp-field: description 0→2000
        reminderMinutesBefore:
            data.time && data.reminderMinutesBefore ? data.reminderMinutesBefore : null,
    };
}
