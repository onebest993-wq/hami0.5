/**
 * Phase-2: تسخين خفيف لمسار Instant الإضبارة الجزائية (BootChrome + store).
 * لا يحمّل ResolvedRuntime الكامل عند الإقلاع.
 */
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';
import {
    prefetchCriminalDashboardChromeWarm,
    prefetchCriminalDashboardPhased,
} from '@/app/runtime/criminalDashboardLoader';

export const CRIMINAL_CHROME_HYDRATED_EVENT = 'hami:criminal-chrome-hydrated';

let bootHydratorArmed = false;
let coldBootPrefetchStarted = false;

function criminalPrefetchAllowed(): boolean {
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
    if (!criminalPrefetchAllowed()) return -1;
    if (isCapacitorNativePlatform()) return 80;
    return 0;
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(CRIMINAL_CHROME_HYDRATED_EVENT));
}

export function prefetchCriminalAfterBootReveal(): void {
    if (typeof window === 'undefined' || coldBootPrefetchStarted) return;
    if (!criminalPrefetchAllowed()) return;
    coldBootPrefetchStarted = true;
    prefetchCriminalDashboardChromeWarm();
    dispatchHydratedOnce();
}

export function bindCriminalBootHydrator(_userId?: string | null): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;

    const onBootRevealDone = () => {
        prefetchCriminalAfterBootReveal();
    };

    const scheduleHydrate = () => {
        prefetchCriminalAfterBootReveal();
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                prefetchCriminalDashboardChromeWarm();
                // موجة idle خفيفة بعد interactive — phased (store→dashboard) فقط عند السماح
                prefetchCriminalDashboardPhased();
                dispatchHydratedOnce();
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

export function resetCriminalBootHydratorForTests(): void {
    bootHydratorArmed = false;
    coldBootPrefetchStarted = false;
}
