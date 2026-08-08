import { prefetchScheduleHubModule } from '@/app/runtime/scheduleHubLoader';
import { prefetchRadarEventForm, prefetchRadarCalendarGrid, prefetchRadarWidgets } from '@/app/runtime/radarWidgetLoader';
import { hydrateScheduleShellForInstantOpenWithData } from '@/app/runtime/scheduleBootHydrator';
import { fetchCalendarEvents, prefetchCalendarCloudModule } from '@/app/services/calendar/calendarCloudRuntime';
import { requestCalendarDossierSyncNow } from '@/app/services/calendar/requestCalendarDossierSyncNow';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { setCachedCalendarEvents } from '@/app/services/calendar/calendarEventsCache';
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

/** ينتظر جلب الأحداث الجاري إن وُجد — يمنع fetch مكرر عند فتح الرادار */
export function awaitCalendarWarmIfInflight(userId: string | null | undefined): Promise<void> {
    const uid = resolveCalendarUserId(userId ?? registeredWarmUserId ?? null);
    if (!uid || warmForUserId !== uid || !warmInflight) return Promise.resolve();
    return warmInflight.then(() => undefined).catch(() => undefined);
}

/** تحميل مسبق لأحداث التقويم في الذاكرة */
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
            setCachedCalendarEvents(warmUid, events);
            if (warmForUserId === warmUid) warmInflight = null;
            return events;
        });

    return warmInflight;
}

/** مسار تسخين موحّد: chunks + أحداث + جسر إضابير — قبل أول فتح */
function warmSchedulePipeline(userId: string | null | undefined, forceHydrate: boolean): void {
    prefetchScheduleHubModule();
    prefetchCalendarCloudModule();
    prefetchRadarEventForm();
    prefetchRadarCalendarGrid();
    prefetchRadarWidgets();
    requestCalendarDossierSyncNow();
    void warmCalendarEventsCache(userId).catch(() => undefined);
    void hydrateScheduleShellForInstantOpenWithData(userId, forceHydrate).catch(() => undefined);
}

/** عند hover/لمس التقويم: كل ما يلزم للفتح الفوري */
export function warmScheduleOnHover(userId?: string | null): void {
    warmSchedulePipeline(userId ?? registeredWarmUserId, false);
}

/** عند فتح التقويم — يتجاوز تعطيل prefetch الخلفي */
export function warmScheduleOnOpen(userId?: string | null): void {
    warmSchedulePipeline(userId ?? registeredWarmUserId, true);
}
