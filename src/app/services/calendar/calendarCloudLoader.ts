import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import {
    CALENDAR_MUTATION_TIMEOUT_MS,
    withCalendarTimeout,
} from '@/app/services/calendar/calendarTimeout';
import SecureStoreService from '@/app/services/SecureStoreService';
import '@/app/services/calendar/calendarNetworkAbort';

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
    // CALENDAR_OWNERSHIP_GUARD: لا تُنفّذ أي استعلام شبكي عند غياب هوية المستخدم المصادق
    if (!userId) return [];
    try { if (typeof SecureStoreService?.ensurePersistedReady === 'function') void SecureStoreService.ensurePersistedReady(); } catch { /* ignore */ }
    const mod = await loadCalendarCloudModule();
    return mod.CalendarDB.getEvents(userId, options);
}

function withMutationTimeout<T>(work: Promise<T>): Promise<T> {
    return withCalendarTimeout(work, CALENDAR_MUTATION_TIMEOUT_MS, 'calendar-save-timeout');
}

export async function saveCalendarEvent(event: CalendarEvent): Promise<void> {
    await withMutationTimeout(
        (async () => {
            const mod = await loadCalendarCloudModule();
            await mod.CalendarDB.saveEvent(event);
        })(),
    );
}

export async function updateCalendarEvent(event: CalendarEvent): Promise<void> {
    await withMutationTimeout(
        (async () => {
            const mod = await loadCalendarCloudModule();
            await mod.CalendarDB.updateEvent(event);
        })(),
    );
}

export async function deleteCalendarEvent(eventId: string, userId: string): Promise<void> {
    // CALENDAR_OWNERSHIP_GUARD: حذف الحدث يقتضي هوية مصادقة سارية لمنع هجمات التلاعب بالمعرفات
    if (!userId) return;
    await withMutationTimeout(
        (async () => {
            const mod = await loadCalendarCloudModule();
            await mod.CalendarDB.deleteEvent(eventId, userId);
        })(),
    );
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
