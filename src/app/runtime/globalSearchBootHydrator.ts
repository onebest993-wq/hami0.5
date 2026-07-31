import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import {
    hydrateGlobalSearchOverlayForInstantOpen,
    isGlobalSearchOverlayModuleResolved,
    prefetchGlobalSearchOverlayChunk,
    prefetchGlobalSearchSearchEngine,
} from '@/app/runtime/globalSearchLoader';

export const GLOBAL_SEARCH_SHELL_HYDRATED_EVENT = 'hami:global-search-shell-hydrated';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;

function globalSearchPrefetchAllowed(): boolean {
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
    if (!globalSearchPrefetchAllowed()) return -1;
    /* فوري بعد interactive — التأخير السابق كان يترك أول ضغط بارداً */
    if (isCapacitorNativePlatform()) return 80;
    return 0;
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT));
}

/**
 * تهيئة واجهة البحث للفتح الفوري بعد dashboard-interactive.
 * محرك البحث (fuse/worker) يُحمّل لاحقاً بأولوية أدنى.
 * @param force يتجاوز تعطيل prefetch عند فتح المستخدم.
 */
export function hydrateGlobalSearchShellForInstantOpen(force = false): Promise<boolean> {
    if (!force && !globalSearchPrefetchAllowed()) return Promise.resolve(false);
    if (isGlobalSearchOverlayModuleResolved()) {
        dispatchHydratedOnce();
        queueMicrotask(() => prefetchGlobalSearchSearchEngine());
        return Promise.resolve(true);
    }
    if (hydrateInflight) return hydrateInflight;

    hydrateInflight = hydrateGlobalSearchOverlayForInstantOpen()
        .then((ok) => {
            if (ok) {
                dispatchHydratedOnce();
                queueMicrotask(() => prefetchGlobalSearchSearchEngine());
            }
            return ok;
        })
        .finally(() => {
            hydrateInflight = null;
        });

    return hydrateInflight;
}

/** يُجدول التحميل بعد dashboard-interactive — قبل نقرة البحث */
export function bindGlobalSearchBootHydrator(): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;

    const scheduleHydrate = () => {
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        /* chunk فوراً — لا تنتظر idle لبدء الشبكة */
        prefetchGlobalSearchOverlayChunk();
        if (delay === 0) {
            void hydrateGlobalSearchShellForInstantOpen().catch(() => undefined);
            return;
        }
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                void hydrateGlobalSearchShellForInstantOpen().catch(() => undefined);
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
export function resetGlobalSearchBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
}
