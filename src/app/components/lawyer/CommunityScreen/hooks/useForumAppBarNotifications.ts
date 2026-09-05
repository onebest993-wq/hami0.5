import { useCallback, useEffect, useRef, useState } from 'react';
import type { ForumNotification } from '@/app/services/lawyer-cloud';
import { FORUM_UNREAD_CHANGED_EVENT } from '@/app/services/forum/forumNotificationEvents';
import { setForumSurfaceLive } from '@/app/runtime/forumSurfaceLive';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import { resolveForumUnreadPollMs } from '../communityFeedPolicy';
import { readForumNotificationsCacheTimed, warmForumNotificationsCache } from '@/app/services/forum/forumNotificationsWarmCache';
import { applyForumNotificationsSnapshot, resolveInitialForumNotifications } from './forumAppBarNotificationSnapshot';
import { useForumNotificationFetch } from './useForumNotificationFetch';
import { useForumAppBarNotificationActions } from './useForumAppBarNotificationActions';

const FORUM_NOTIF_CACHE_HYDRATE_MS = 1_500;

export function useForumAppBarNotifications(
    userId: string | null | undefined,
    notificationStreamActive: boolean,
    onNavigateToPost?: (postId: string) => void,
    onSectionChange?: (section: 'forum') => void,
    surfaceOpen = true,
) {
    const initial = resolveInitialForumNotifications(userId);
    const [notifications, setNotifications] = useState<ForumNotification[]>(initial.notifications);
    const [unreadCount, setUnreadCount] = useState(initial.unreadCount);
    const [showNotifPanel, setShowNotifPanel] = useState(false);
    const [refreshingNotifs, setRefreshingNotifs] = useState(false);
    const lastUnreadRef = useRef(initial.unreadCount);
    const seenNotifIdsRef = useRef<Set<string>>(new Set(initial.notifications.map((n) => n.id)));
    const notificationsRef = useRef(initial.notifications);
    const refreshInflightRef = useRef(0);
    notificationsRef.current = notifications;

    const fetchRefs = { notificationsRef, lastUnreadRef, seenNotifIdsRef, refreshInflightRef };

    const fetchNotifications = useForumNotificationFetch(
        userId,
        fetchRefs,
        setNotifications,
        setUnreadCount,
        setRefreshingNotifs,
    );

    const seedNotificationsFromLocal = useCallback((targetUserId: string) => {
        const seeded = resolveInitialForumNotifications(targetUserId);
        if (seeded.notifications.length === 0) return false;
        setNotifications(seeded.notifications);
        setUnreadCount(seeded.unreadCount);
        applyForumNotificationsSnapshot(
            seeded.notifications,
            seeded.unreadCount,
            seenNotifIdsRef,
            lastUnreadRef,
        );
        return true;
    }, []);

    useEffect(() => {
        if (!userId) {
            setForumSurfaceLive(false);
            setNotifications([]);
            setUnreadCount(0);
            lastUnreadRef.current = 0;
            seenNotifIdsRef.current = new Set();
            setRefreshingNotifs(false);
            return;
        }
        if (surfaceOpen === false) {
            setForumSurfaceLive(false);
            return;
        }

        setForumSurfaceLive(true);
        let cancelled = false;

        const bootstrap = async () => {
            seedNotificationsFromLocal(userId);

            warmForumNotificationsCache(userId);
            const warmed = await readForumNotificationsCacheTimed(
                userId,
                FORUM_NOTIF_CACHE_HYDRATE_MS,
                () => ({
                    notifications: notificationsRef.current,
                    unreadCount: lastUnreadRef.current,
                }),
            );
            if (!cancelled && warmed.notifications.length > 0) {
                setNotifications(warmed.notifications);
                setUnreadCount(warmed.unreadCount);
                applyForumNotificationsSnapshot(
                    warmed.notifications,
                    warmed.unreadCount,
                    seenNotifIdsRef,
                    lastUnreadRef,
                );
            }

            if (cancelled) return;
            if (warmed.timedOut || warmed.notifications.length === 0) {
                await fetchNotifications({ background: true });
            }
        };

        void bootstrap();
        return () => {
            cancelled = true;
            refreshInflightRef.current += 1;
            setForumSurfaceLive(false);
        };
    }, [fetchNotifications, seedNotificationsFromLocal, userId, surfaceOpen]);

    useVisibilityAwareInterval(
        () => {
            void fetchNotifications({ background: true });
        },
        resolveForumUnreadPollMs(notificationStreamActive),
        Boolean(userId) && surfaceOpen !== false,
    );

    useEffect(() => {
        const onExternal = (e: Event) => {
            const detail = (e as CustomEvent<{ count: number; refresh?: boolean }>).detail;
            if (typeof detail?.count === 'number') {
                setUnreadCount(detail.count);
                lastUnreadRef.current = detail.count;
            }
            if (detail?.refresh) void fetchNotifications({ background: true });
        };
        window.addEventListener(FORUM_UNREAD_CHANGED_EVENT, onExternal);
        return () => window.removeEventListener(FORUM_UNREAD_CHANGED_EVENT, onExternal);
    }, [fetchNotifications]);

    const {
        handleMarkAllRead,
        handleNotificationClick,
        handleNotificationDismiss,
        handleBellClick,
    } = useForumAppBarNotificationActions({
        userId,
        lastUnreadRef,
        seenNotifIdsRef,
        setNotifications,
        setUnreadCount,
        setShowNotifPanel,
        fetchNotifications,
        seedNotificationsFromLocal,
        onNavigateToPost,
        onSectionChange,
    });

    return {
        notifications,
        unreadCount,
        showNotifPanel,
        setShowNotifPanel,
        loadingNotifs: false,
        refreshingNotifs,
        handleMarkAllRead,
        handleNotificationClick,
        handleNotificationDismiss,
        handleBellClick,
    };
}
