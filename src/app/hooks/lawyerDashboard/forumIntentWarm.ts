import { prefetchCommunityScreenModule } from '@/app/runtime/communityHubLoader';
import { hydrateCommunityShellForInstantOpen } from '@/app/runtime/communityBootHydrator';
import { warmForumNotificationsCache } from '@/app/services/forum/forumNotificationsWarmCache';
import { warmForumPostsCache } from '@/app/services/forum/forumPostsWarmCache';
import { warmForumSocialCache } from '@/app/services/forum/forumSocialWarmCache';

export function warmForumSocialForUser(userId: string | null | undefined): void {
    if (!userId) return;
    warmForumSocialCache(userId);
    warmForumNotificationsCache(userId);
}

/**
 * عند hover/لمس المنتدى — تجهيز chunk + كاش المنشورات.
 */
export function warmForumOnHover(userId?: string | null): void {
    if (typeof window === 'undefined') return;
    prefetchCommunityScreenModule();
    warmForumPostsCache();
    warmForumSocialForUser(userId);
}

/** عند فتح المنتدى */
export function warmForumOnOpen(userId?: string | null): void {
    warmForumOnHover(userId);
    if (typeof window === 'undefined') return;
    void hydrateCommunityShellForInstantOpen(true);
    warmForumPostsCache();
}
