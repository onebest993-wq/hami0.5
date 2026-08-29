import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import {
    isSectionBackgroundPrefetchAllowed,
    sectionBackgroundHydrateDelayMs,
} from '@/app/runtime/sectionPrefetchPolicy';
import {
    hydrateCommunityScreenForInstantOpen,
    isCommunityScreenModuleResolved,
} from '@/app/runtime/communityHubLoader';
import { prefetchCommunityCloudModule } from '@/app/services/forum/communityCloudLoader';
import { warmForumPostsCache } from '@/app/services/forum/forumPostsWarmCache';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';

export const COMMUNITY_SHELL_HYDRATED_EVENT = 'hami:community-shell-hydrated';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;
let coldBootPrefetchStarted = false;

function communityPrefetchAllowed(): boolean {
    return isSectionBackgroundPrefetchAllowed();
}

function hydrateDelayMs(): number {
    return sectionBackgroundHydrateDelayMs(400, import.meta.env.DEV ? 400 : 600);
}

function dispatchHydratedOnce(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(COMMUNITY_SHELL_HYDRATED_EVENT));
}

async function liveSessionCanUseForumNetwork(): Promise<boolean> {
    const [{ canUseNetworkFeatures }, { getLiveAuthUserId }] = await Promise.all([
        import('@/app/services/auth/lawyerAccountStatus'),
        import('@/app/utils/liveAuthUserId'),
    ]);
    return canUseNetworkFeatures(getLiveAuthUserId());
}

/**
 * تسخين المنتدى بعد الكشف + idle + حساب معتمد — لا عند هيكل الجذع.
 */
export function prefetchForumAfterBootReveal(): void {
    if (typeof window === 'undefined' || coldBootPrefetchStarted) return;
    if (!communityPrefetchAllowed()) return;

    void liveSessionCanUseForumNetwork()
        .then((allowed) => {
            if (!allowed || coldBootPrefetchStarted) return;
            const delay = hydrateDelayMs();
            if (delay < 0) return;
            coldBootPrefetchStarted = true;
            scheduleIdleWork(
                () => {
                    void ensureDeferredFeatureStylesLoaded();
                    void import('@/app/runtime/communityOverlayEntryLoader')
                        .then((m) => m.prefetchCommunityOverlayEntry())
                        .catch(() => undefined);
                    void hydrateCommunityShellForInstantOpen().catch(() => undefined);
                },
                { minDelayMs: delay, timeoutMs: 8_000 },
            );
        })
        .catch(() => undefined);
}

/**
 * تهيئة shell المنتدى + كاش المنشورات للفتح الفوري.
 * @param force يتجاوز تعطيل prefetch عند فتح المستخدم.
 */
export function hydrateCommunityShellForInstantOpen(force = false): Promise<boolean> {
    if (!force && !communityPrefetchAllowed()) return Promise.resolve(false);

    const maybeWarmPosts = async () => {
        if (!(await liveSessionCanUseForumNetwork())) return;
        warmForumPostsCache();
    };

    if (isCommunityScreenModuleResolved()) {
        void maybeWarmPosts().catch(() => undefined);
        void ensureDeferredFeatureStylesLoaded();
        dispatchHydratedOnce();
        return Promise.resolve(true);
    }
    if (hydrateInflight) return hydrateInflight;

    hydrateInflight = hydrateCommunityScreenForInstantOpen()
        .then(async (ok) => {
            if (ok) {
                await maybeWarmPosts().catch(() => undefined);
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
 * يُجدول تسخين المنتدى بعد boot-reveal فقط — لا interactive ولا lawyer-dashboard-ready من الجذع.
 */
export function bindCommunityBootHydrator(): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    const onBootRevealDone = () => {
        prefetchForumAfterBootReveal();
    };

    window.addEventListener(BOOT_REVEAL_DONE_EVENT, onBootRevealDone, { once: true });
    if (isBootRevealDone()) {
        queueMicrotask(onBootRevealDone);
    }

    return () => {
        bootHydratorArmed = false;
        window.removeEventListener(BOOT_REVEAL_DONE_EVENT, onBootRevealDone);
    };
}

/** للاختبارات */
export function resetCommunityBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
    coldBootPrefetchStarted = false;
}
