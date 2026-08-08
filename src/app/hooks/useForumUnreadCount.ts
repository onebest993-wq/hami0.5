import { useCallback, useEffect, useState } from 'react';
import {
    emitForumUnreadCount,
    FORUM_UNREAD_CHANGED_EVENT,
} from '@/app/services/forum/forumNotificationEvents';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import { resolveForumUnreadPollMs } from '@/app/components/lawyer/CommunityScreen/communityFeedPolicy';

export type ForumUnreadCountState = {
    count: number;
    isLoading: boolean;
};

/** عدّاد تنبيهات المنتدى غير المقروءة — للشارة على بطاقة الرئيسية */
export function useForumUnreadCount(userId: string | null, enabled = true): ForumUnreadCountState {
    const [count, setCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [streamRunning, setStreamRunning] = useState(false);

    const refresh = useCallback(
        async (opts?: { silent?: boolean }) => {
            if (!userId) {
                setCount(0);
                setIsLoading(false);
                emitForumUnreadCount(0);
                return;
            }
            if (!opts?.silent) {
                setIsLoading(true);
            }
            try {
                const [{ ForumApiService }, { syncForumNotificationsToAppStore }] = await Promise.all([
                    import('@/app/services/forumApiService'),
                    import('@/app/services/forum/forumNotificationBridge'),
                ]);
                const { notifications, unreadCount } = await ForumApiService.listForumNotifications(userId);
                syncForumNotificationsToAppStore(userId, notifications);
                setCount(unreadCount);
                emitForumUnreadCount(unreadCount);
            } catch {
                /* silent */
            } finally {
                if (!opts?.silent) {
                    setIsLoading(false);
                }
            }
        },
        [userId],
    );

    useEffect(() => {
        if (!enabled) {
            setIsLoading(false);
            return;
        }
        void refresh({ silent: true });
    }, [enabled, refresh]);

    useEffect(() => {
        if (!enabled) {
            setStreamRunning(false);
            return;
        }
        let cancelled = false;
        let unsub: (() => void) | undefined;
        void import('@/app/services/forum/ForumNotificationStreamService').then((m) => {
            if (cancelled) return;
            setStreamRunning(m.ForumNotificationStreamService.isRunning());
            unsub = m.ForumNotificationStreamService.subscribe(() => {
                if (!cancelled) {
                    setStreamRunning(m.ForumNotificationStreamService.isRunning());
                }
            });
        });
        return () => {
            cancelled = true;
            unsub?.();
        };
    }, [enabled]);

    useVisibilityAwareInterval(
        () => {
            void refresh({ silent: true });
        },
        resolveForumUnreadPollMs(streamRunning),
        enabled && Boolean(userId),
    );

    useEffect(() => {
        const onExternal = (e: Event) => {
            const detail = (e as CustomEvent<{ count: number; refresh?: boolean }>).detail;
            if (typeof detail?.count === 'number') setCount(detail.count);
            if (detail?.refresh) void refresh();
        };
        window.addEventListener(FORUM_UNREAD_CHANGED_EVENT, onExternal);
        return () => window.removeEventListener(FORUM_UNREAD_CHANGED_EVENT, onExternal);
    }, [refresh]);

    return { count, isLoading: enabled ? isLoading : false };
}
