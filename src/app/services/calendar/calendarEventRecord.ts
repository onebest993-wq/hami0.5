import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

/**
 * صف مخزّن صالح للعرض/الفهرسة — بلا تاريخ نصّي ينهار `date.startsWith` في الرادار.
 */
export function newCalendarEventId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `cal_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function isUsableCalendarEventRecord(raw: unknown): raw is CalendarEvent {
    if (!raw || typeof raw !== 'object') return false;
    const e = raw as Partial<CalendarEvent>;
    return (
        typeof e.id === 'string' &&
        e.id.trim().length > 0 &&
        typeof e.userId === 'string' &&
        e.userId.trim().length > 0 &&
        typeof e.title === 'string' &&
        typeof e.date === 'string' &&
        e.date.trim().length > 0
    );
}
