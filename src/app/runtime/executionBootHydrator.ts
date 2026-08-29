/**
 * Phase-2: تسخين مسار Instant إضبارة التنفيذ.
 * first-paint للإضبارة لا يُلغى بـ lite — أول فتح على الموبايل كان بارداً دائماً.
 */
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import {
    isSectionBackgroundPrefetchAllowed,
    sectionBackgroundHydrateDelayMs,
} from '@/app/runtime/sectionPrefetchPolicy';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';
import {
    prefetchExecutionDashboardChromeWarm,
    primeExecutionDossierSurface,
} from '@/app/runtime/executionDashboardLoader';

export const EXECUTION_CHROME_HYDRATED_EVENT = 'hami:execution-chrome-hydrated';

let bootHydratorArmed = false;
let coldBootPrefetchStarted = false;

function executionHeavyPrefetchAllowed(): boolean {
    return isSectionBackgroundPrefetchAllowed();
}

/** مسار الإضبارة الحرج — يعمل حتى مع lite (ما لم يُعطَّل prefetchScreens / localOnly) */
function executionDossierPrimeAllowed(): boolean {
    return isSectionBackgroundPrefetchAllowed({ allowOnLite: true });
}

function hydrateDelayMs(): number {
    return sectionBackgroundHydrateDelayMs(
        80,
        0,
        executionHeavyPrefetchAllowed() || executionDossierPrimeAllowed(),
    );
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(EXECUTION_CHROME_HYDRATED_EVENT));
}

function runExecutionBootPrime(): void {
    if (!executionDossierPrimeAllowed()) return;
    // JS فقط بعد كشف اللوحة — CSS الأضابير (~408KB) عند نية/فتح الإضبارة لا مع الإقلاع
    primeExecutionDossierSurface({ includeFeatureStyles: false });
    if (executionHeavyPrefetchAllowed()) {
        prefetchExecutionDashboardChromeWarm();
    }
    dispatchHydratedOnce();
}

/** تسخين فوري بعد رفع حاجز الإقلاع — first-paint للإضبارة دائماً (حتى lite). */
export function prefetchExecutionAfterBootReveal(): void {
    if (typeof window === 'undefined' || coldBootPrefetchStarted) return;
    if (!executionDossierPrimeAllowed()) return;
    coldBootPrefetchStarted = true;
    runExecutionBootPrime();
}

/**
 * 1) prefetch فوري عند `hami:boot-reveal-done`
 * 2) إعادة تأكيد عند `hami:dashboard-interactive`
 */
export function bindExecutionBootHydrator(_userId?: string | null): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;

    const onBootRevealDone = () => {
        prefetchExecutionAfterBootReveal();
    };

    const scheduleHydrate = () => {
        prefetchExecutionAfterBootReveal();
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                runExecutionBootPrime();
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

export function resetExecutionBootHydratorForTests(): void {
    bootHydratorArmed = false;
    coldBootPrefetchStarted = false;
}
