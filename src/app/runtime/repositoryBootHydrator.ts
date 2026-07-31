import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import {
    hydrateRepositoryShellForInstantOpen,
    isRepositoryHubModuleResolved,
    prefetchRepositoryFeedModule,
    prefetchRepositoryHubModule,
} from '@/app/runtime/repositoryHubLoader';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';

export const REPOSITORY_SHELL_HYDRATED_EVENT = 'hami:repository-shell-hydrated';
/** pointerdown/hover على أيقونة المستودع — يركّب Host مخفياً قبل الـ click */
export const REPOSITORY_PRIME_HOST_EVENT = 'hami:repository-prime-host';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;
let coldBootPrefetchStarted = false;

function warmRepositoryDataCache(userId?: string | null): Promise<unknown> {
    return import('@/app/hooks/lawyerDashboard/repositoryIntentWarm')
        .then((m) => m.warmRepositoryDataCache(userId))
        .catch(() => []);
}

function prefetchRepositoryOverlayChunks(): void {
    if (typeof window === 'undefined') return;
    void import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry'
    ).catch(() => undefined);
}

function repositoryPrefetchAllowed(): boolean {
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
    if (!repositoryPrefetchAllowed()) return -1;
    /* فوري — أي تأخير = InstantShell على أول فتح */
    return 0;
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(REPOSITORY_SHELL_HYDRATED_EVENT));
}

/** يُستدعى من الدوك عند pointerdown — يسبق الـ click بـ ~100ms لتبنّي التغذية */
export function dispatchRepositoryPrimeHost(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(REPOSITORY_PRIME_HOST_EVENT));
}

export function isRepositoryShellFullyHydrated(): boolean {
    return isRepositoryHubModuleResolved();
}

/**
 * تسخين فوري بعد رفع حاجز الإقلاع — قبل نقرة المستودع / استعادة الجلسة.
 */
export function prefetchRepositoryAfterBootReveal(userId?: string | null): void {
    if (typeof window === 'undefined' || coldBootPrefetchStarted) return;
    if (!repositoryPrefetchAllowed()) return;
    coldBootPrefetchStarted = true;

    void ensureDeferredFeatureStylesLoaded();
    prefetchRepositoryOverlayChunks();
    prefetchRepositoryFeedModule();
    prefetchRepositoryHubModule();
    void hydrateRepositoryBootShellForInstantOpen(userId, false).catch(() => undefined);
}

/**
 * تهيئة shell المستودع + بيانات vault للفتح الفوري.
 * @param force يتجاوز تعطيل prefetch عند فتح المستخدم.
 */
export function hydrateRepositoryBootShellForInstantOpen(
    userId?: string | null,
    force = false,
): Promise<boolean> {
    if (!force && !repositoryPrefetchAllowed()) return Promise.resolve(false);
    if (isRepositoryShellFullyHydrated()) {
        if (userId?.trim()) void warmRepositoryDataCache(userId).catch(() => undefined);
        dispatchHydratedOnce();
        return Promise.resolve(true);
    }
    if (hydrateInflight) return hydrateInflight;

    hydrateInflight = hydrateRepositoryShellForInstantOpen()
        .then((ok) => {
            if (ok) dispatchHydratedOnce();
            if (ok && userId?.trim()) {
                void warmRepositoryDataCache(userId).catch(() => undefined);
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
export function bindRepositoryBootHydrator(userId?: string | null): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;
    const uid = userId?.trim() || undefined;

    const onBootRevealDone = () => {
        prefetchRepositoryAfterBootReveal(uid);
    };

    const scheduleHydrate = () => {
        prefetchRepositoryAfterBootReveal(uid);
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                prefetchRepositoryOverlayChunks();
                prefetchRepositoryFeedModule();
                prefetchRepositoryHubModule();
                void hydrateRepositoryBootShellForInstantOpen(uid).catch(() => undefined);
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
export function resetRepositoryBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
    coldBootPrefetchStarted = false;
}
