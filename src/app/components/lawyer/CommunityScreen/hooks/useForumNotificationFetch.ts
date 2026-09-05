import { useCallback, useRef } from 'react';
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
    const hydratedRef = useRef(false);

    return useCallback(
        async (options?: { background?: boolean }) => {
            if (!userId) {
                hydratedRef.current = false;
                setNotifications([]);
                setUnreadCount(0);
                setRefreshingNotifs(false);
                return;
            }

            const refreshId = ++refreshInflightRef.current;
            if (!options?.background) {
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
                const prev = notificationsRef.current;
                const sameSlice =
                    prev.length === slice.length &&
                    prev.every(
                        (n, i) =>
                            n.id === slice[i]?.id &&
                            n.read === slice[i]?.read &&
                            n.title === slice[i]?.title &&
                            n.message === slice[i]?.message &&
                            (n.activityCount ?? 0) === (slice[i]?.activityCount ?? 0),
                    );
                if (!sameSlice || lastUnreadRef.current !== unread) {
                    setNotifications(slice);
                    setUnreadCount(unread);
                }

                if (hydratedRef.current && unread > lastUnreadRef.current) {
                    const fresh = slice.find((n) => !n.read && !seenNotifIdsRef.current.has(n.id));
                    if (fresh) {
                        SmartToast.show(fresh.title, {
                            type: 'info',
                            description: fresh.message,
                            duration: 4500,
                        });
                    }
                }
                hydratedRef.current = true;
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
