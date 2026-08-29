/**
 * Phase-2: تسخين خفيف لمسار Instant الإضبارة الجزائية (BootChrome + store).
 * لا يحمّل ResolvedRuntime الكامل عند الإقلاع.
 * لا تسخين فوري على boot-reveal — ينافس تلاشي الشعار؛ التسخين من interactive.
 */
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isSectionBackgroundPrefetchAllowed, sectionBackgroundHydrateDelayMs } from '@/app/runtime/sectionPrefetchPolicy';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';
import {
    prefetchCriminalDashboardChromeWarm,
    prefetchCriminalDashboardPhased,
} from '@/app/runtime/criminalDashboardLoader';

export const CRIMINAL_CHROME_HYDRATED_EVENT = 'hami:criminal-chrome-hydrated';

let bootHydratorArmed = false;
let coldBootPrefetchStarted = false;

function criminalPrefetchAllowed(): boolean {
    return isSectionBackgroundPrefetchAllowed();
}

function hydrateDelayMs(): number {
    return sectionBackgroundHydrateDelayMs();
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
    let hydrateScheduled = false;

    const scheduleHydrate = () => {
        if (hydrateScheduled) return;
        hydrateScheduled = true;
        prefetchCriminalAfterBootReveal();
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                prefetchCriminalDashboardChromeWarm();
                prefetchCriminalDashboardPhased();
                dispatchHydratedOnce();
            },
            { minDelayMs: delay, timeoutMs: 4_000 },
        );
    };

    /* كشف الشعار وحده لا يسحب chrome — انتظر interactive أو لوحة جاهزة */
    window.addEventListener('hami:dashboard-interactive', scheduleHydrate, { once: true });

    const maybeHydrateIfAlreadyReady = () => {
        if (document.querySelector('[data-testid="lawyer-dashboard-ready"]')) {
            scheduleHydrate();
        }
    };

    window.addEventListener(BOOT_REVEAL_DONE_EVENT, maybeHydrateIfAlreadyReady, { once: true });
    if (isBootRevealDone()) {
        queueMicrotask(maybeHydrateIfAlreadyReady);
    } else {
        maybeHydrateIfAlreadyReady();
    }

    return () => {
        bootHydratorArmed = false;
        cancelIdle?.();
        cancelIdle = undefined;
        window.removeEventListener(BOOT_REVEAL_DONE_EVENT, maybeHydrateIfAlreadyReady);
        window.removeEventListener('hami:dashboard-interactive', scheduleHydrate);
    };
}

export function resetCriminalBootHydratorForTests(): void {
    bootHydratorArmed = false;
    coldBootPrefetchStarted = false;
}
