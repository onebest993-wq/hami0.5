import { hydrateScheduleShellForInstantOpenWithData } from '@/app/runtime/scheduleBootHydrator';
import { runScheduleWarmCore } from '@/app/runtime/scheduleWarmCore';
import { requestCalendarDossierSyncNow } from '@/app/services/calendar/requestCalendarDossierSyncNow';
import {
    getRegisteredScheduleWarmUserId,
} from '@/app/services/calendar/calendarEventsWarm';

/*
 * كاش الأحداث انتقل إلى `services/calendar/calendarEventsWarm`، ويُعاد من هنا
 * تصديراً لمستهلكيه القائمين.
 *
 * السبب دائرة استيراد ثابتة على مسار الإقلاع: هذا الملفّ يستورد المُرطِّب، والمُرطِّب
 * كان يستورد `warmCalendarEventsCache` من هنا. والورقة الجديدة لا تستورد أيّاً
 * منهما، فالضلع الراجع انقطع من أصله.
 */
export {
    awaitCalendarWarmIfInflight,
    registerScheduleWarmUserId,
    warmCalendarEventsCache,
} from '@/app/services/calendar/calendarEventsWarm';

/** مسار تسخين موحّد: chunks + أحداث + جسر إضابير — قبل أول فتح */
function warmSchedulePipeline(userId: string | null | undefined, forceHydrate: boolean): void {
    runScheduleWarmCore({ userId, prefetchCloud: 'always' });
    requestCalendarDossierSyncNow();
    void hydrateScheduleShellForInstantOpenWithData(userId, forceHydrate).catch(() => undefined);
}

/** عند hover/لمس التقويم: كل ما يلزم للفتح الفوري */
export function warmScheduleOnHover(userId?: string | null): void {
    warmSchedulePipeline(userId ?? getRegisteredScheduleWarmUserId(), false);
}

/** عند فتح التقويم — يتجاوز تعطيل prefetch الخلفي */
export function warmScheduleOnOpen(userId?: string | null): void {
    warmSchedulePipeline(userId ?? getRegisteredScheduleWarmUserId(), true);
}
