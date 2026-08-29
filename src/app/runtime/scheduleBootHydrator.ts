import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import {
    isSectionBackgroundPrefetchAllowed,
    sectionBackgroundHydrateDelayMs,
} from '@/app/runtime/sectionPrefetchPolicy';
import { prefetchCalendarCloudModule } from '@/app/services/calendar/calendarCloudLoader';
import { requestCalendarDossierSyncNow } from '@/app/services/calendar/requestCalendarDossierSyncNow';
import { warmCalendarEventsCache } from '@/app/services/calendar/calendarEventsWarm';
import {
    hydrateScheduleShellForInstantOpen,
    isScheduleShellModuleResolved,
    prefetchScheduleHubModule,
} from '@/app/runtime/scheduleHubLoader';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';

export const SCHEDULE_SHELL_HYDRATED_EVENT = 'hami:schedule-shell-hydrated';
/** pointerdown/hover على أيقونة التقويم — تسخين مقطع بلا تركيب Host حتى فتح التبويب */
export const SCHEDULE_PRIME_HOST_EVENT = 'hami:schedule-prime-host';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;
let coldBootPrefetchStarted = false;

function schedulePrefetchAllowed(): boolean {
    return isSectionBackgroundPrefetchAllowed();
}

function hydrateDelayMs(): number {
    return sectionBackgroundHydrateDelayMs(0, 0);
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

/**
 * تسخين فوري بعد رفع حاجز الإقلاع — قبل نقرة التقويم / استعادة الجلسة.
 */
export function prefetchScheduleAfterBootReveal(userId?: string | null): void {
    if (typeof window === 'undefined' || coldBootPrefetchStarted) return;
    if (!schedulePrefetchAllowed()) return;
    coldBootPrefetchStarted = true;

    void ensureDeferredFeatureStylesLoaded();
    prefetchScheduleHubModule();
    prefetchCalendarCloudModule();
    requestCalendarDossierSyncNow();
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
    prefetchScheduleHubModule();
    if (isScheduleShellModuleResolved()) {
        prefetchCalendarCloudModule();
        void warmCalendarEventsCache(userId).catch(() => undefined);
        dispatchHydratedOnce();
        return Promise.resolve(true);
    }
    if (hydrateInflight) return hydrateInflight;

    hydrateInflight = hydrateScheduleShellForInstantOpen()
        .then((ok) => {
            if (ok) {
                prefetchCalendarCloudModule();
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
