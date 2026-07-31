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
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';

export const COMMUNITY_SHELL_HYDRATED_EVENT = 'hami:community-shell-hydrated';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;
let coldBootPrefetchStarted = false;

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
    /* Android: أسرع من 400ms حتى يصل Host قبل أول نقرة على الدوك */
    if (isCapacitorNativePlatform()) return 120;
    return import.meta.env.DEV ? 120 : 200;
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(COMMUNITY_SHELL_HYDRATED_EVENT));
}

/**
 * تسخين فوري بعد رفع حاجز الإقلاع — يلغي ~150ms parse lag عند أول نقرة.
 * لا ينتظر idle ولا dashboard-interactive.
 */
export function prefetchForumAfterBootReveal(): void {
    if (typeof window === 'undefined' || coldBootPrefetchStarted) return;
    if (!communityPrefetchAllowed()) return;
    coldBootPrefetchStarted = true;

    void ensureDeferredFeatureStylesLoaded();
    void import('@/app/runtime/communityOverlayEntryLoader')
        .then((m) => m.prefetchCommunityOverlayEntry())
        .catch(() => undefined);
    prefetchCommunityScreenModule();
    void import('@/app/components/lawyer/CommunityScreen/CommunityScreenHost').catch(() => undefined);
    void import('@/app/components/lawyer/CommunityScreen/components/ForumInstantShell').catch(() => undefined);
    void hydrateCommunityShellForInstantOpen().catch(() => undefined);
}

/**
 * تهيئة shell المنتدى + كاش المنشورات للفتح الفوري.
 * @param force يتجاوز تعطيل prefetch عند فتح المستخدم.
 */
export function hydrateCommunityShellForInstantOpen(force = false): Promise<boolean> {
    if (!force && !communityPrefetchAllowed()) return Promise.resolve(false);
    if (isCommunityScreenModuleResolved()) {
        warmForumPostsCache();
        void ensureDeferredFeatureStylesLoaded();
        dispatchHydratedOnce();
        return Promise.resolve(true);
    }
    if (hydrateInflight) return hydrateInflight;

    hydrateInflight = hydrateCommunityScreenForInstantOpen()
        .then(async (ok) => {
            if (ok) {
                warmForumPostsCache();
                warmRepositoryDocsCache();
                void ensureDeferredFeatureStylesLoaded();
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

/**
 * يُجدول:
 * 1) prefetch فوري عند `hami:boot-reveal-done` (أو إن كان الإقلاع منتهياً)
 * 2) hydrate إضافي عند `hami:dashboard-interactive`
 */
export function bindCommunityBootHydrator(): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;

    const onBootRevealDone = () => {
        prefetchForumAfterBootReveal();
    };

    const scheduleHydrate = () => {
        prefetchForumAfterBootReveal();
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
export function resetCommunityBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
    coldBootPrefetchStarted = false;
}
