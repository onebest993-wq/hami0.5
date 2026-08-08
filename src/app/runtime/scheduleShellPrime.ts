/**
 * مسار تسخين موحّد للتقويم — نقطة دخول واحدة بدل prefetch متفرق.
 */

import { warmCalendarEventsCache } from '@/app/hooks/lawyerDashboard/scheduleIntentWarm';
import { hydrateScheduleShellForInstantOpenWithData } from '@/app/runtime/scheduleBootHydrator';
import { prefetchScheduleHubModule } from '@/app/runtime/scheduleHubLoader';
import { prefetchRadarEventForm } from '@/app/runtime/radarWidgetLoader';

export function primeScheduleForBoot(): void {
    prefetchScheduleHubModule();
    prefetchRadarEventForm();
}

/** تسخين بيانات + نموذج الإضافة عند arm/فتح */
export function primeScheduleForWarm(userId?: string | null): void {
    primeScheduleForBoot();
    const uid = userId?.trim();
    if (!uid) return;
    void hydrateScheduleShellForInstantOpenWithData(uid, true).catch(() => undefined);
    void warmCalendarEventsCache(uid).catch(() => undefined);
}
