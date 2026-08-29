/** بطاقات الرادار تستخدم `cal_${storedId}` بينما البحث يمرّر معرّف CalendarDB الخام. */

export const UNIFIED_CALENDAR_EVENT_PREFIX = 'cal_';

export function unifiedCalendarEventId(storedId: string): string {
    return `${UNIFIED_CALENDAR_EVENT_PREFIX}${storedId}`;
}

export function storedCalendarIdFromUnified(unifiedId: string): string {
    return unifiedId.startsWith(UNIFIED_CALENDAR_EVENT_PREFIX)
        ? unifiedId.slice(UNIFIED_CALENDAR_EVENT_PREFIX.length)
        : unifiedId;
}

export function eventMatchesCalendarFocus(
    event: { id: string; bridge?: { calendarRecordId?: string } },
    focusId: string | undefined,
): boolean {
    if (focusId == null || focusId === '') return false;
    const focus = String(focusId);
    if (event.id === focus) return true;
    if (event.bridge?.calendarRecordId === focus) return true;
    if (storedCalendarIdFromUnified(event.id) === focus) return true;
    if (event.id === unifiedCalendarEventId(focus)) return true;
    return false;
}

export function resolveHighlightUnifiedEventId(
    events: Array<{ id: string; bridge?: { calendarRecordId?: string } }>,
    focusId: string | undefined,
): string | undefined {
    if (!focusId) return undefined;
    return events.find((e) => eventMatchesCalendarFocus(e, focusId))?.id;
}
