/**
 * Phase-2: تسخين خفيف لمسار Instant إضبارة الدعوى (portal + BootChrome).
 * عند interactive فقط يُضاف phased الخفيف إن سُمح — لا keepAlive.
 */
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import {
    isSectionBackgroundPrefetchAllowed,
    sectionBackgroundHydrateDelayMs,
} from '@/app/runtime/sectionPrefetchPolicy';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { prefetchSmartFileModalPhased } from '@/app/runtime/smartFileModalLoader';
import { prefetchSmartFileModalPortal } from '@/app/components/lawyer/dashboard/smartFileModalPortalLazy';

export const SMART_FILE_CHROME_HYDRATED_EVENT = 'hami:smart-file-chrome-hydrated';

let bootHydratorArmed = false;
let coldBootPrefetchStarted = false;

function smartFilePrefetchAllowed(): boolean {
    return isSectionBackgroundPrefetchAllowed();
}

function hydrateDelayMs(): number {
    return sectionBackgroundHydrateDelayMs();
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(SMART_FILE_CHROME_HYDRATED_EVENT));
}

/** Chrome/portal فقط عند الإقلاع — بدون phased الكامل. */
export function prefetchSmartFileChromeWarm(): void {
    if (typeof window === 'undefined') return;
    prefetchSmartFileModalPortal();
    void import('@/app/components/lawyer/dashboard/SmartFileModalBootChrome').catch(() => undefined);
}

export function prefetchSmartFileAfterBootReveal(): void {
    if (typeof window === 'undefined' || coldBootPrefetchStarted) return;
    if (!smartFilePrefetchAllowed()) return;
    coldBootPrefetchStarted = true;
    prefetchSmartFileChromeWarm();
    dispatchHydratedOnce();
}

export function bindSmartFileBootHydrator(_userId?: string | null): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;

    const onBootRevealDone = () => {
        prefetchSmartFileAfterBootReveal();
    };

    const scheduleHydrate = () => {
        prefetchSmartFileAfterBootReveal();
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                prefetchSmartFileChromeWarm();
                prefetchSmartFileModalPhased();
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

export function resetSmartFileBootHydratorForTests(): void {
    bootHydratorArmed = false;
    coldBootPrefetchStarted = false;
}
