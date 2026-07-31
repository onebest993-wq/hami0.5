import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { ForumNotification } from '@/app/services/lawyer-cloud';
import { ForumApiService } from '@/app/services/forumApiService';
import { withForumAsyncTimeout } from '../forumAsync';
import { applyForumNotificationsSnapshot } from './forumAppBarNotificationSnapshot';

export const FORUM_NOTIF_FETCH_TIMEOUT_MS = 4_000;

export type ForumNotificationFetchRefs = {
    notificationsRef: MutableRefObject<ForumNotification[]>;
    lastUnreadRef: MutableRefObject<number>;
    seenNotifIdsRef: MutableRefObject<Set<string>>;
    refreshInflightRef: MutableRefObject<number>;
};

export function useForumNotificationFetch(
    userId: string | null | undefined,
    refs: ForumNotificationFetchRefs,
    setNotifications: (value: ForumNotification[] | ((prev: ForumNotification[]) => ForumNotification[])) => void,
    setUnreadCount: (value: number | ((prev: number) => number)) => void,
    setRefreshingNotifs: (value: boolean) => void,
) {
    const { notificationsRef, lastUnreadRef, seenNotifIdsRef, refreshInflightRef } = refs;

    return useCallback(
        async (options?: { background?: boolean }) => {
            if (!userId) {
                setNotifications([]);
                setUnreadCount(0);
                setRefreshingNotifs(false);
                return;
            }

            const refreshId = ++refreshInflightRef.current;
            if (options?.background) {
                setRefreshingNotifs(true);
            }

            try {
                const { notifications: list, unreadCount: unread } = await withForumAsyncTimeout(
                    ForumApiService.listForumNotifications(userId),
                    FORUM_NOTIF_FETCH_TIMEOUT_MS,
                    {
                        notifications: notificationsRef.current,
                        unreadCount: lastUnreadRef.current,
                    },
                );

                if (refreshId !== refreshInflightRef.current) return;

                const slice = list.slice(0, 25);
                setNotifications(slice);
                setUnreadCount(unread);

                if (lastUnreadRef.current > 0 && unread > lastUnreadRef.current) {
                    const fresh = slice.find((n) => !n.read && !seenNotifIdsRef.current.has(n.id));
                    if (fresh) {
                        SmartToast.show(fresh.title, {
                            type: 'info',
                            description: fresh.message,
                            duration: 4500,
                        });
                    }
                }
                applyForumNotificationsSnapshot(slice, unread, seenNotifIdsRef, lastUnreadRef);
            } catch {
                if (notificationsRef.current.length === 0) {
                    SmartToast.error('تعذّر تحميل التنبيهات');
                }
            } finally {
                if (refreshId === refreshInflightRef.current) {
                    setRefreshingNotifs(false);
                }
            }
        },
        [
            lastUnreadRef,
            notificationsRef,
            refreshInflightRef,
            seenNotifIdsRef,
            setNotifications,
            setRefreshingNotifs,
            setUnreadCount,
            userId,
        ],
    );
}
