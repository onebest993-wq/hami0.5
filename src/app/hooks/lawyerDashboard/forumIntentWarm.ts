import { warmForumPostsCache } from '@/app/services/forum/forumPostsWarmCache';
import { warmForumSocialCache } from '@/app/services/forum/forumSocialWarmCache';
import { prefetchCommunityOverlayEntry } from '@/app/runtime/communityOverlayEntryLoader';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { shouldAllowIntentWarmFromDom } from '@/app/services/settings/intentWarmGate';
import { readPersistedCommunitySection } from '@/app/components/lawyer/CommunityScreen/communitySectionState';

function hydrateCommunityShellForInstantOpen(force?: boolean): Promise<boolean> {
    return import('@/app/runtime/communityBootHydrator').then((m) =>
        m.hydrateCommunityShellForInstantOpen(force),
    );
}

/** Host مركّب متزامناً مع OverlayEntry — التسخين يمر عبر المحتوى والكاش */
function prefetchCommunityScreenHost(): void {
    void import('@/app/components/lawyer/CommunityScreen/CommunityScreenHost').catch(() => undefined);
}

function prefetchPersistedLandingSection(): void {
    void import('@/app/components/lawyer/CommunityScreen/communityScreenLazySections')
        .then((m) => m.prefetchPersistedCommunitySectionChunk())
        .catch(() => undefined);
    if (readPersistedCommunitySection() !== 'groups') return;
    void import('@/app/services/forum/forumGroupsWarmCache')
        .then((m) => m.warmForumGroupsCache())
        .catch(() => undefined);
}

export function warmForumSocialForUser(userId: string | null | undefined): void {
    if (!userId) return;
    void import('@/app/services/auth/lawyerAccountStatus').then(({ canUseNetworkFeatures }) => {
        if (!canUseNetworkFeatures(userId)) return;
        warmForumSocialCache(userId);
        void import('@/app/services/forum/forumNotificationsWarmCache')
            .then((m) => m.warmForumNotificationsCache(userId))
            .catch(() => undefined);
    });
}

/**
 * عند hover/لمس المنتدى — تجهيز chunk الغلاف + المحتوى + كاش المنشورات.
 * لا يُسخَّن مستودع المنتدى هنا إلا إذا كان التبويب المحفوظ.
 */
export function warmForumOnHover(userId?: string | null): void {
    if (typeof window === 'undefined') return;
    if (!shouldAllowIntentWarmFromDom()) return;
    prefetchCommunityOverlayEntry();
    prefetchCommunityScreenHost();
    prefetchPersistedLandingSection();
    void import('@/app/services/auth/lawyerAccountStatus').then(({ canUseNetworkFeatures }) => {
        if (!canUseNetworkFeatures(userId)) return;
        warmForumPostsCache();
        warmForumSocialForUser(userId);
    });
}

/** عند فتح المنتدى */
export function warmForumOnOpen(userId?: string | null): void {
    if (typeof window === 'undefined') return;
    prefetchCommunityScreenHost();
    prefetchPersistedLandingSection();
    if (isLitePerformanceActive() || !shouldAllowIntentWarmFromDom()) {
        void hydrateCommunityShellForInstantOpen(true);
        return;
    }
    warmForumOnHover(userId);
    void hydrateCommunityShellForInstantOpen(true);
    void import('@/app/services/auth/lawyerAccountStatus').then(({ canUseNetworkFeatures }) => {
        if (canUseNetworkFeatures(userId)) warmForumPostsCache();
    });
}
