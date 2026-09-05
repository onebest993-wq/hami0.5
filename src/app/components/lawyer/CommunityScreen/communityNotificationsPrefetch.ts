import { settleIdleChunkPrefetch } from './settleIdleChunkPrefetch';

const NOTIFICATIONS_PANEL =
    '@/app/components/lawyer/CommunityScreen/components/ForumNotificationsPanel';

export function importForumNotificationsPanel() {
    return import('@/app/components/lawyer/CommunityScreen/components/ForumNotificationsPanel').then(
        (m) => ({
            default: m.ForumNotificationsPanel,
        }),
    );
}

export function prefetchForumNotificationsPanel(): void {
    if (typeof window === 'undefined') return;
    void settleIdleChunkPrefetch(NOTIFICATIONS_PANEL, importForumNotificationsPanel());
}
