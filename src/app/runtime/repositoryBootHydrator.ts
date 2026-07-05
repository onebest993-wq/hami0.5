import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import {
    hydrateRepositoryShellForInstantOpen,
    isRepositoryHubModuleResolved,
} from '@/app/runtime/repositoryHubLoader';
import { warmRepositoryDataCache } from '@/app/hooks/lawyerDashboard/repositoryIntentWarm';

export const REPOSITORY_SHELL_HYDRATED_EVENT = 'hami:repository-shell-hydrated';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;

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
    if (isCapacitorNativePlatform()) return 400;
    return import.meta.env.DEV ? 120 : 200;
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(REPOSITORY_SHELL_HYDRATED_EVENT));
}

export function isRepositoryShellFullyHydrated(): boolean {
    return isRepositoryHubModuleResolved();
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
        .then(async (ok) => {
            if (ok && userId?.trim()) {
                await warmRepositoryDataCache(userId).catch(() => undefined);
            }
            if (ok) dispatchHydratedOnce();
            return ok;
        })
        .finally(() => {
            hydrateInflight = null;
        });

    return hydrateInflight;
}

/** يُجدول التحميل بعد dashboard-interactive — قبل نقرة المستودع */
export function bindRepositoryBootHydrator(userId?: string | null): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;
    const uid = userId?.trim() || undefined;

    const scheduleHydrate = () => {
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                void hydrateRepositoryBootShellForInstantOpen(uid).catch(() => undefined);
            },
            { minDelayMs: delay, timeoutMs: 8_000 },
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
export function resetRepositoryBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
}
