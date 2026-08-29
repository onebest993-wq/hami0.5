import { sanitizeNotificationEntityId } from '@/app/services/notifications/notificationNavigateSecurity';

/**
 * يعلّق معرّف موعد المنبّه عند نقر إشعار النظام قبل تركيب مضيّف التقويم.
 */
const STORAGE_KEY = 'hami:calendar-alarm-pending:v1';

export function stashPendingCalendarAlarmEventId(eventId: string): void {
    const trimmed = sanitizeNotificationEntityId(eventId);
    if (!trimmed || typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
        /* ignore */
    }
}

export function peekPendingCalendarAlarmEventId(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
        const value = sessionStorage.getItem(STORAGE_KEY);
        return sanitizeNotificationEntityId(value);
    } catch {
        return null;
    }
}

export function clearPendingCalendarAlarmEventId(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

export function consumePendingCalendarAlarmEventId(): string | null {
    const value = peekPendingCalendarAlarmEventId();
    if (value) clearPendingCalendarAlarmEventId();
    return value;
}
