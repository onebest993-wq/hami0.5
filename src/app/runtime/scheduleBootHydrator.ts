import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import { prefetchCalendarCloudModule } from '@/app/services/calendar/calendarCloudRuntime';
import { warmCalendarEventsCache } from '@/app/hooks/lawyerDashboard/scheduleIntentWarm';
import {
    hydrateScheduleShellForInstantOpen,
    isScheduleShellModuleResolved,
} from '@/app/runtime/scheduleHubLoader';
import { prefetchRadarWidgets } from '@/app/runtime/radarWidgetLoader';

export const SCHEDULE_SHELL_HYDRATED_EVENT = 'hami:schedule-shell-hydrated';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;

function schedulePrefetchAllowed(): boolean {
    try {
        const s = getLawyerSettingsSnapshot();
        if (s.security.localOnlyMode) return false;
        if (s.performance.prefetchScreens === false) return false;
        if (isLitePerformanceActive(s.performance.litePerformance)) return false;
    } catch {
        /* ignore */
    }
    return true;
}

function hydrateDelayMs(): number {
    if (!schedulePrefetchAllowed()) return -1;
    if (isCapacitorNativePlatform()) return 400;
    return import.meta.env.DEV ? 120 : 200;
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(SCHEDULE_SHELL_HYDRATED_EVENT));
}

/**
 * تهيئة shell التقويم + كاش الأحداث للفتح الفوري.
 * @param force يتجاوز تعطيل prefetch عند فتح المستخدم.
 */
export function hydrateScheduleShellForInstantOpenWithData(
    userId?: string | null,
    force = false,
): Promise<boolean> {
    if (!force && !schedulePrefetchAllowed()) return Promise.resolve(false);
    if (isScheduleShellModuleResolved()) {
        prefetchCalendarCloudModule();
        prefetchRadarWidgets();
        void warmCalendarEventsCache(userId).catch(() => undefined);
        dispatchHydratedOnce();
        return Promise.resolve(true);
    }
    if (hydrateInflight) return hydrateInflight;

    hydrateInflight = hydrateScheduleShellForInstantOpen()
        .then((ok) => {
            if (ok) {
                prefetchCalendarCloudModule();
                prefetchRadarWidgets();
                void warmCalendarEventsCache(userId).catch(() => undefined);
                dispatchHydratedOnce();
            }
            return ok;
        })
        .finally(() => {
            hydrateInflight = null;
        });

    return hydrateInflight;
}

/** يُجدول التحميل بعد dashboard-interactive — قبل نقرة «التقويم» */
export function bindScheduleBootHydrator(userId?: string | null): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;

    const scheduleHydrate = () => {
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                prefetchCalendarCloudModule();
                prefetchRadarWidgets();
                void hydrateScheduleShellForInstantOpenWithData(userId);
            },
            { minDelayMs: delay, timeoutMs: 10_000 },
        );
    };

    window.addEventListener('hami:dashboard-interactive', scheduleHydrate, { once: true });

    if (document.querySelector('[data-testid="lawyer-dashboard-ready"]')) {
        scheduleHydrate();
    }

    return () => {
        bootHydratorArmed = false;
        cancelIdle?.();
        cancelIdle = undefined;
        window.removeEventListener('hami:dashboard-interactive', scheduleHydrate);
    };
}

/** للاختبارات */
export function resetScheduleBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
}
