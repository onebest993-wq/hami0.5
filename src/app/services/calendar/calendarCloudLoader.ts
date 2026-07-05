import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

type CalendarCloudModule = typeof import('@/app/services/cloud/lawyerCalendarCloud');

let calendarCloudModulePromise: Promise<CalendarCloudModule> | null = null;

function loadCalendarCloudModule(): Promise<CalendarCloudModule> {
    if (!calendarCloudModulePromise) {
        calendarCloudModulePromise = import('@/app/services/cloud/lawyerCalendarCloud');
    }
    return calendarCloudModulePromise;
}

/** جلب أحداث التقويم — dynamic import لعدم ربط الواجهة بـ lawyer-cloud monolith. */
export async function fetchCalendarEvents(
    userId: string,
    options?: { forceRefresh?: boolean },
): Promise<CalendarEvent[]> {
    const mod = await loadCalendarCloudModule();
    return mod.CalendarDB.getEvents(userId, options);
}

const CALENDAR_SAVE_TIMEOUT_MS = 8_000;

function withSaveTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            window.setTimeout(() => reject(new Error('calendar-save-timeout')), CALENDAR_SAVE_TIMEOUT_MS);
        }),
    ]);
}

export async function saveCalendarEvent(event: CalendarEvent): Promise<void> {
    const mod = await loadCalendarCloudModule();
    await withSaveTimeout(mod.CalendarDB.saveEvent(event));
}

export async function updateCalendarEvent(event: CalendarEvent): Promise<void> {
    const mod = await loadCalendarCloudModule();
    return mod.CalendarDB.updateEvent(event);
}

export async function deleteCalendarEvent(eventId: string, userId: string): Promise<void> {
    const mod = await loadCalendarCloudModule();
    return mod.CalendarDB.deleteEvent(eventId, userId);
}

/** تحميل مسبق لـ chunk التقويم — hover/idle على الرئيسية */
export function prefetchCalendarCloudModule(): void {
    if (typeof window === 'undefined') return;
    void loadCalendarCloudModule();
}

/** للاختبارات — إعادة تعيين cache الوحدة. */
export function resetCalendarCloudLoaderForTests(): void {
    calendarCloudModulePromise = null;
}
