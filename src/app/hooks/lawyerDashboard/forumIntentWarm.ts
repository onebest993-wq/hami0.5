import { prefetchCommunityScreenModule } from '@/app/slices/community/public';
import { warmForumPostsCache } from '@/app/services/forum/forumPostsWarmCache';
import { warmForumSocialCache } from '@/app/services/forum/forumSocialWarmCache';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { shouldAllowIntentWarmFromDom } from '@/app/services/settings/intentWarmGate';

function hydrateCommunityShellForInstantOpen(force?: boolean): Promise<boolean> {
    return import('@/app/runtime/communityBootHydrator').then((m) =>
        m.hydrateCommunityShellForInstantOpen(force),
    );
}

function prefetchForumRepositorySection(): void {
    void import('@/app/components/lawyer/CommunityScreen/communityScreenLazySections')
        .then((m) => m.prefetchCommunityRepositorySection())
        .catch(() => undefined);
}

/** Host مركّب متزامناً مع OverlayEntry — التسخين يمر عبر المحتوى والكاش */
function prefetchCommunityScreenHost(): void {
    void import('@/app/components/lawyer/CommunityScreen/CommunityScreenHost').catch(() => undefined);
}

function prefetchCommunityOverlayEntry(): void {
    void import('@/app/runtime/communityOverlayEntryLoader')
        .then((m) => m.prefetchCommunityOverlayEntry())
        .catch(() => undefined);
}

export function warmForumSocialForUser(userId: string | null | undefined): void {
    if (!userId) return;
    warmForumSocialCache(userId);
    void import('@/app/services/forum/forumNotificationsWarmCache')
        .then((m) => m.warmForumNotificationsCache(userId))
        .catch(() => undefined);
}

/**
 * عند hover/لمس المنتدى — تجهيز chunk الغلاف + المحتوى + كاش المنشورات.
 */
export function warmForumOnHover(userId?: string | null): void {
    if (typeof window === 'undefined') return;
    if (!shouldAllowIntentWarmFromDom()) return;
    prefetchCommunityOverlayEntry();
    prefetchCommunityScreenHost();
    prefetchCommunityScreenModule();
    void import('@/app/components/lawyer/CommunityScreen')
        .then((m) => m.prefetchCommunityScreenContent())
        .catch(() => undefined);
    warmForumPostsCache();
    warmForumSocialForUser(userId);
    prefetchForumRepositorySection();
}

/** عند فتح المنتدى */
export function warmForumOnOpen(userId?: string | null): void {
    if (typeof window === 'undefined') return;
    prefetchCommunityScreenHost();
    if (isLitePerformanceActive() || !shouldAllowIntentWarmFromDom()) {
        prefetchCommunityScreenModule();
        void hydrateCommunityShellForInstantOpen(true);
        prefetchForumRepositorySection();
        return;
    }
    warmForumOnHover(userId);
    void hydrateCommunityShellForInstantOpen(true);
    warmForumPostsCache();
}
