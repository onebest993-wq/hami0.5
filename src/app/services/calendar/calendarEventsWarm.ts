/**
 * تسخين كاش أحداث التقويم — ورقة معزولة عن مُرطِّب الإقلاع.
 *
 * لماذا انفصلت عن `scheduleIntentWarm`: ذاك الملفّ يستورد
 * `hydrateScheduleShellForInstantOpenWithData` من `runtime/scheduleBootHydrator`،
 * والمُرطِّب يستورد `warmCalendarEventsCache` منه — دائرة استيراد ثابتة على مسار
 * الإقلاع نفسه، وهو أخطر موضع تقع فيه: ترتيب التهيئة هناك يُحدّده مَن حُمِّل أوّلاً،
 * وعطل TDZ فيه يمنع رفع حاجز الإقلاع فلا يرى المحامي شاشة أصلاً.
 *
 * وهذه الثلاثيّة لا تحتاج المُرطِّب قطّ: كاشٌ لأحداث وجَلبٌ واحدٌ مُدمَج. أمّا
 * `warmSchedulePipeline` فهو الذي يحتاجه، ويبقى هناك.
 *
 * حالة `registeredWarmUserId` تسكن هنا لأنها للجَلب لا للتسخين العامّ، ويقرأها
 * خطّ الأنابيب بالدالّة المُصدَّرة أدناه — نسخةٌ واحدة لا نسختان تفترقان.
 */
import { fetchCalendarEvents } from '@/app/services/calendar/calendarCloudRuntime';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/core';
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

/** المُسجَّل الحالي — يقرأه خطّ تسخين الجدول بدل نسخ الحالة */
export function getRegisteredScheduleWarmUserId(): string | null | undefined {
    return registeredWarmUserId;
}

/** ينتظر جلب الأحداث الجاري إن وُجد — يمنع fetch مكرر عند فتح الرادار */
export function awaitCalendarWarmIfInflight(userId: string | null | undefined): Promise<void> {
    const uid = resolveCalendarUserId(userId ?? registeredWarmUserId ?? null);
    if (!uid || warmForUserId !== uid || !warmInflight) return Promise.resolve();
    return warmInflight.then(() => undefined).catch(() => undefined);
}

/** تحميل مسبق لأحداث التقويم في الذاكرة */
export function warmCalendarEventsCache(
    userId: string | null | undefined,
): Promise<CalendarEvent[]> {
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
