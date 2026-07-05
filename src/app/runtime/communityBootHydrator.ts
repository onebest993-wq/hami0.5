import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import {
    hydrateCommunityScreenForInstantOpen,
    isCommunityScreenModuleResolved,
    prefetchCommunityScreenModule,
} from '@/app/runtime/communityHubLoader';
import { prefetchCommunityCloudModule } from '@/app/services/forum/communityCloudLoader';
import { warmForumPostsCache } from '@/app/services/forum/forumPostsWarmCache';
import { warmRepositoryDocsCache } from '@/app/services/forum/repositoryDocsWarmCache';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';

export const COMMUNITY_SHELL_HYDRATED_EVENT = 'hami:community-shell-hydrated';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;

function communityPrefetchAllowed(): boolean {
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
    if (!communityPrefetchAllowed()) return -1;
    if (isCapacitorNativePlatform()) return 400;
    return import.meta.env.DEV ? 120 : 200;
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(COMMUNITY_SHELL_HYDRATED_EVENT));
}

/**
 * تهيئة shell المنتدى + كاش المنشورات للفتح الفوري.
 * @param force يتجاوز تعطيل prefetch عند فتح المستخدم.
 */
export function hydrateCommunityShellForInstantOpen(force = false): Promise<boolean> {
    if (!force && !communityPrefetchAllowed()) return Promise.resolve(false);
    if (isCommunityScreenModuleResolved()) {
        warmForumPostsCache();
        ensureDeferredFeatureStylesLoaded();
        dispatchHydratedOnce();
        return Promise.resolve(true);
    }
    if (hydrateInflight) return hydrateInflight;

    hydrateInflight = hydrateCommunityScreenForInstantOpen()
        .then(async (ok) => {
            if (ok) {
                warmForumPostsCache();
                warmRepositoryDocsCache();
                ensureDeferredFeatureStylesLoaded();
                prefetchCommunityCloudModule();
                dispatchHydratedOnce();
            }
            return ok;
        })
        .finally(() => {
            hydrateInflight = null;
        });

    return hydrateInflight;
}

/** يُجدول التحميل بعد dashboard-interactive — قبل نقرة المنتدى */
export function bindCommunityBootHydrator(): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;

    const scheduleHydrate = () => {
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                prefetchCommunityScreenModule();
                void hydrateCommunityShellForInstantOpen().catch(() => undefined);
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
export function resetCommunityBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
}
