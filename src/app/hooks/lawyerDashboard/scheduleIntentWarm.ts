import { prefetchSmartLegalRadar } from '@/app/utils/lazyComponents';
import { prefetchScheduleHubModule } from '@/app/runtime/scheduleHubLoader';
import { fetchCalendarEvents, prefetchCalendarCloudModule } from '@/app/services/calendar/calendarCloudLoader';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

let registeredWarmUserId: string | null | undefined;
let warmInflight: Promise<CalendarEvent[]> | null = null;
let warmForUserId: string | null = null;

/** يسجّل userId للـ prefetch من الدوك دون تمرير صريح */
export function registerScheduleWarmUserId(userId: string | null | undefined): () => void {
    registeredWarmUserId = userId;
    return () => {
        if (registeredWarmUserId === userId) registeredWarmUserId = undefined;
    };
}

/** تحميل مسبق لأحداث التقويم في الذاكرة — idle على الرئيسية */
export function warmCalendarEventsCache(userId: string | null | undefined): Promise<CalendarEvent[]> {
    if (typeof window === 'undefined') return Promise.resolve([]);
    const uid = resolveCalendarUserId(userId ?? registeredWarmUserId ?? null);
    if (!uid) return Promise.resolve([]);
    if (warmForUserId === uid && warmInflight) return warmInflight;

    warmForUserId = uid;
    const warmUid = uid;
    warmInflight = fetchCalendarEvents(uid)
        .catch(() => [] as CalendarEvent[])
        .then((events) => {
            if (warmForUserId === warmUid) warmInflight = null;
            return events;
        });

    return warmInflight;
}

/** عند hover/لمس التقويم: prefetch للـ chunks + تجهيز mount */
export function warmScheduleOnHover(userId?: string | null): void {
    const resolvedUserId = userId ?? registeredWarmUserId;
    prefetchScheduleHubModule();
    prefetchSmartLegalRadar();
    prefetchCalendarCloudModule();
    warmCalendarEventsCache(resolvedUserId).catch(() => undefined);
}

/** عند فتح تبويب الجدول أو idle على الرئيسية */
export function warmScheduleOnOpen(userId?: string | null): void {
    warmScheduleOnHover(userId);
}
