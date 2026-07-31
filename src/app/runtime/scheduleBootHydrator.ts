import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import { prefetchCalendarCloudModule } from '@/app/services/calendar/calendarCloudLoader';
import { warmCalendarEventsCache } from '@/app/hooks/lawyerDashboard/scheduleIntentWarm';
import {
    hydrateScheduleShellForInstantOpen,
    isScheduleShellModuleResolved,
    prefetchScheduleHubModule,
    prefetchScheduleTabHostModule,
} from '@/app/runtime/scheduleHubLoader';
import { prefetchRadarWidgets } from '@/app/runtime/radarWidgetLoader';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';

export const SCHEDULE_SHELL_HYDRATED_EVENT = 'hami:schedule-shell-hydrated';
/** pointerdown/hover على أيقونة التقويم — يركّب Host مخفياً قبل الـ click */
export const SCHEDULE_PRIME_HOST_EVENT = 'hami:schedule-prime-host';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;
let coldBootPrefetchStarted = false;

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
    // فوري بعد جاهزية اللوحة — كل ms تأخير = Instant gap عند أول فتح
    if (isCapacitorNativePlatform()) return 80;
    return 0;
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(SCHEDULE_SHELL_HYDRATED_EVENT));
}

/** يُستدعى من الدوك عند pointerdown — يسبق الـ click بـ ~100ms لتبنّي chunk التقويم */
export function dispatchSchedulePrimeHost(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(SCHEDULE_PRIME_HOST_EVENT));
}

function warmSecondaryRadarWidgets(): void {
    scheduleIdleWork(
        () => {
            prefetchRadarWidgets();
        },
        { minDelayMs: 120, timeoutMs: 4_000 },
    );
}

/**
 * تسخين فوري بعد رفع حاجز الإقلاع — قبل نقرة التقويم / استعادة الجلسة.
 */
export function prefetchScheduleAfterBootReveal(userId?: string | null): void {
    if (typeof window === 'undefined' || coldBootPrefetchStarted) return;
    if (!schedulePrefetchAllowed()) return;
    coldBootPrefetchStarted = true;

    void ensureDeferredFeatureStylesLoaded();
    prefetchScheduleTabHostModule();
    prefetchScheduleHubModule();
    void hydrateScheduleShellForInstantOpenWithData(userId, false).catch(() => undefined);
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
    prefetchScheduleTabHostModule();
    if (isScheduleShellModuleResolved()) {
        prefetchScheduleHubModule();
        prefetchCalendarCloudModule();
        void warmCalendarEventsCache(userId).catch(() => undefined);
        warmSecondaryRadarWidgets();
        dispatchHydratedOnce();
        return Promise.resolve(true);
    }
    if (hydrateInflight) return hydrateInflight;

    hydrateInflight = hydrateScheduleShellForInstantOpen()
        .then((ok) => {
            if (ok) {
                prefetchCalendarCloudModule();
                void warmCalendarEventsCache(userId).catch(() => undefined);
                warmSecondaryRadarWidgets();
                dispatchHydratedOnce();
            }
            return ok;
        })
        .finally(() => {
            hydrateInflight = null;
        });

    return hydrateInflight;
}

/**
 * يُجدول:
 * 1) prefetch فوري عند `hami:boot-reveal-done`
 * 2) hydrate إضافي عند `hami:dashboard-interactive`
 */
export function bindScheduleBootHydrator(userId?: string | null): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;
    const uid = userId?.trim() || undefined;

    const onBootRevealDone = () => {
        prefetchScheduleAfterBootReveal(uid);
    };

    const scheduleHydrate = () => {
        prefetchScheduleAfterBootReveal(uid);
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                prefetchScheduleTabHostModule();
                prefetchScheduleHubModule();
                prefetchCalendarCloudModule();
                void hydrateScheduleShellForInstantOpenWithData(uid);
            },
            { minDelayMs: delay, timeoutMs: 4_000 },
        );
    };

    window.addEventListener(BOOT_REVEAL_DONE_EVENT, onBootRevealDone, { once: true });
    if (isBootRevealDone()) {
        queueMicrotask(onBootRevealDone);
    }

    window.addEventListener('hami:dashboard-interactive', scheduleHydrate, { once: true });

    if (document.querySelector('[data-testid="lawyer-dashboard-ready"]')) {
        scheduleHydrate();
    }

    return () => {
        bootHydratorArmed = false;
        cancelIdle?.();
        cancelIdle = undefined;
        window.removeEventListener(BOOT_REVEAL_DONE_EVENT, onBootRevealDone);
        window.removeEventListener('hami:dashboard-interactive', scheduleHydrate);
    };
}

/** للاختبارات */
export function resetScheduleBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
    coldBootPrefetchStarted = false;
}
