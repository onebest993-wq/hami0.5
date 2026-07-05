import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { ForumNotification } from '@/app/services/lawyer-cloud';
import { ForumApiService } from '@/app/services/forumApiService';
import { FORUM_UNREAD_CHANGED_EVENT } from '@/app/services/forum/forumNotificationBridge';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import { withForumAsyncTimeout } from '../forumAsync';
import {
    peekForumNotificationsCache,
    peekForumNotificationsFromLocal,
    peekForumNotificationsUnreadCache,
    readForumNotificationsCache,
    warmForumNotificationsCache,
} from '@/app/services/forum/forumNotificationsWarmCache';

const FORUM_NOTIF_FETCH_TIMEOUT_MS = 4_000;
const FORUM_NOTIF_CACHE_HYDRATE_MS = 1_500;

function resolveInitialForumNotifications(userId: string | null | undefined): {
    notifications: ForumNotification[];
    unreadCount: number;
} {
    if (!userId) return { notifications: [], unreadCount: 0 };
    const cached = peekForumNotificationsCache(userId);
    if (cached && cached.length > 0) {
        return {
            notifications: cached,
            unreadCount: peekForumNotificationsUnreadCache(userId) ?? cached.filter((n) => !n.read).length,
        };
    }
    const local = peekForumNotificationsFromLocal(userId);
    return {
        notifications: local,
        unreadCount: local.filter((n) => !n.read).length,
    };
}

function applyForumNotificationsSnapshot(
    slice: ForumNotification[],
    unread: number,
    seenNotifIdsRef: React.MutableRefObject<Set<string>>,
    lastUnreadRef: React.MutableRefObject<number>,
): void {
    lastUnreadRef.current = unread;
    for (const n of slice) seenNotifIdsRef.current.add(n.id);
}

export function useForumAppBarNotifications(
    userId: string | null | undefined,
    notificationStreamActive: boolean,
    onNavigateToPost?: (postId: string) => void,
    onSectionChange?: (section: 'forum') => void,
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

    const fetchNotifications = useCallback(
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
                    SmartToast.error('تعذّر تحميل التنبiehات');
                }
            } finally {
                if (refreshId === refreshInflightRef.current) {
                    setRefreshingNotifs(false);
                }
            }
        },
        [userId],
    );

    useEffect(() => {
        if (!userId) {
            setNotifications([]);
            setUnreadCount(0);
            lastUnreadRef.current = 0;
            seenNotifIdsRef.current = new Set();
            setRefreshingNotifs(false);
            return;
        }

        let cancelled = false;

        const bootstrap = async () => {
            seedNotificationsFromLocal(userId);

            warmForumNotificationsCache(userId);
            const warmed = await withForumAsyncTimeout(readForumNotificationsCache(userId), FORUM_NOTIF_CACHE_HYDRATE_MS, {
                notifications: notificationsRef.current,
                unreadCount: lastUnreadRef.current,
            });
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
            await fetchNotifications({ background: true });
        };

        void bootstrap();
        return () => {
            cancelled = true;
            refreshInflightRef.current += 1;
        };
    }, [fetchNotifications, seedNotificationsFromLocal, userId]);

    useVisibilityAwareInterval(
        () => {
            void fetchNotifications({ background: true });
        },
        notificationStreamActive ? 45_000 : 5_000,
        Boolean(userId),
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

    const handleMarkAllRead = useCallback(async () => {
        if (!userId) return;
        try {
            await ForumApiService.markAllForumNotificationsRead(userId);
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
            lastUnreadRef.current = 0;
            SmartToast.success('تم تحديد جميع التنبيهات كمقروءة');
        } catch {
            SmartToast.error('تعذّر تحديث التنبيهات');
        }
    }, [userId]);

    const handleNotificationClick = useCallback(
        async (notif: ForumNotification) => {
            if (!userId) return;
            try {
                if (!notif.read) {
                    await ForumApiService.markForumNotificationRead(notif.id, userId);
                    setNotifications((prev) =>
                        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
                    );
                    setUnreadCount((c) => Math.max(0, c - 1));
                    lastUnreadRef.current = Math.max(0, lastUnreadRef.current - 1);
                }
                setShowNotifPanel(false);
                if (notif.postId) {
                    onSectionChange?.('forum');
                    onNavigateToPost?.(notif.postId);
                }
            } catch {
                SmartToast.error('تعذّر فتح التنبيه');
            }
        },
        [onNavigateToPost, onSectionChange, userId],
    );

    const handleNotificationDismiss = useCallback(
        async (notif: ForumNotification) => {
            if (!userId) return;
            const wasUnread = !notif.read;
            setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
            setUnreadCount((count) => Math.max(0, count - (wasUnread ? 1 : 0)));
            lastUnreadRef.current = Math.max(0, lastUnreadRef.current - (wasUnread ? 1 : 0));
            seenNotifIdsRef.current.delete(notif.id);

            try {
                await ForumApiService.dismissForumNotification(notif.id, userId);
            } catch {
                setNotifications((prev) => {
                    const restored = [notif, ...prev].sort(
                        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
                    );
                    return restored.slice(0, 25);
                });
                if (wasUnread) {
                    setUnreadCount((count) => count + 1);
                    lastUnreadRef.current += 1;
                }
                SmartToast.error('تعذّر إزالة التنبيه');
            }
        },
        [userId],
    );

    const handleBellClick = useCallback(
        (onDropdownChange?: (open: boolean) => void) => {
            if (!userId) {
                SmartToast.warning('سجّل الدخول لعرض التنبيهات');
                return;
            }
            setShowNotifPanel((v) => {
                const next = !v;
                if (next) {
                    seedNotificationsFromLocal(userId);
                    void fetchNotifications({ background: true });
                }
                onDropdownChange?.(next);
                return next;
            });
        },
        [fetchNotifications, seedNotificationsFromLocal, userId],
    );

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
