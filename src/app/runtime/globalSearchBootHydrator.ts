import {
    isSectionBackgroundPrefetchAllowed,
    sectionBackgroundHydrateDelayMs,
} from '@/app/runtime/sectionPrefetchPolicy';
import {
    hydrateGlobalSearchOverlayForInstantOpen,
    isGlobalSearchOverlayModuleResolved,
    prefetchGlobalSearchInstantPaintCover,
} from '@/app/runtime/globalSearchLoader';

export const GLOBAL_SEARCH_SHELL_HYDRATED_EVENT = 'hami:global-search-shell-hydrated';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;

function globalSearchPrefetchAllowed(): boolean {
    return isSectionBackgroundPrefetchAllowed();
}

function hydrateDelayMs(): number {
    return sectionBackgroundHydrateDelayMs(0, 0);
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT));
}

/**
 * جاهزية مقطع الواجهة — بلا fuse/worker (يُحمَّلان عند اللمسة أو الفتح).
 * @param force يتجاوز تعطيل prefetch عند فتح المستخدم.
 */
export function hydrateGlobalSearchShellForInstantOpen(force = false): Promise<boolean> {
    if (!force && !globalSearchPrefetchAllowed()) return Promise.resolve(false);
    if (isGlobalSearchOverlayModuleResolved()) {
        dispatchHydratedOnce();
        return Promise.resolve(true);
    }
    if (hydrateInflight) return hydrateInflight;

    hydrateInflight = hydrateGlobalSearchOverlayForInstantOpen()
        .then((ok) => {
            if (ok) {
                dispatchHydratedOnce();
            }
            return ok;
        })
        .finally(() => {
            hydrateInflight = null;
        });

    return hydrateInflight;
}

/** يُجدول قشرة الطلاء بعد dashboard-interactive — المقطع الكامل عند اللمسة */
export function bindGlobalSearchBootHydrator(): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    const scheduleChunkPrefetch = () => {
        if (hydrateDelayMs() < 0) return;
        prefetchGlobalSearchInstantPaintCover();
    };

    window.addEventListener('hami:dashboard-interactive', scheduleChunkPrefetch, { once: true });

    if (document.querySelector('[data-testid="lawyer-dashboard-ready"]')) {
        scheduleChunkPrefetch();
    }

    return () => {
        bootHydratorArmed = false;
        window.removeEventListener('hami:dashboard-interactive', scheduleChunkPrefetch);
    };
}

/** للاختبارات */
export function resetGlobalSearchBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
}
