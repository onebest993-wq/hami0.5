import { warmCalendarEventsCache } from '@/app/services/calendar/calendarEventsWarm';
import { prefetchCalendarCloudModule } from '@/app/services/calendar/calendarCloudLoader';
import { prefetchScheduleHubModule } from '@/app/runtime/scheduleHubLoader';

type ScheduleWarmCoreOptions = {
    userId?: string | null;
    /** always: cloud chunk حتى بلا userId — when-user: فقط عند وجود هوية */
    prefetchCloud?: 'always' | 'when-user';
};

/** Hub + (اختياري) cloud chunk + كاش أحداث — بلا hydrator ولا dossier */
export function runScheduleWarmCore(options?: ScheduleWarmCoreOptions): void {
    prefetchScheduleHubModule();
    const uid = options?.userId?.trim();
    const cloudMode = options?.prefetchCloud ?? 'when-user';
    if (cloudMode === 'always' || uid) {
        prefetchCalendarCloudModule();
    }
    void warmCalendarEventsCache(options?.userId ?? null).catch(() => undefined);
}
