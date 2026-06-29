import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { ForumNotification } from '@/app/services/lawyer-cloud';
import { ForumApiService } from '@/app/services/forumApiService';
import { FORUM_UNREAD_CHANGED_EVENT } from '@/app/services/forum/forumNotificationBridge';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';

export function useForumAppBarNotifications(
    userId: string | null | undefined,
    notificationStreamActive: boolean,
    onNavigateToPost?: (postId: string) => void,
    onSectionChange?: (section: 'forum') => void,
) {
    const [notifications, setNotifications] = useState<ForumNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifPanel, setShowNotifPanel] = useState(false);
    const [loadingNotifs, setLoadingNotifs] = useState(false);
    const lastUnreadRef = useRef(0);
    const seenNotifIdsRef = useRef<Set<string>>(new Set());

    const fetchNotifications = useCallback(async () => {
        if (!userId) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }
        setLoadingNotifs(true);
        try {
            const { notifications: list, unreadCount: unread } =
                await ForumApiService.listForumNotifications(userId);
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
            lastUnreadRef.current = unread;
            for (const n of slice) seenNotifIdsRef.current.add(n.id);
        } catch {
            SmartToast.error('تعذّر تحميل التنبيهات');
        } finally {
            setLoadingNotifs(false);
        }
    }, [userId]);

    useEffect(() => {
        void fetchNotifications();
    }, [fetchNotifications]);

    useVisibilityAwareInterval(
        () => {
            void fetchNotifications();
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
            if (detail?.refresh) void fetchNotifications();
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

    const handleBellClick = useCallback(
        (onDropdownChange?: (open: boolean) => void) => {
            if (!userId) {
                SmartToast.warning('سجّل الدخول لعرض التنبيهات');
                return;
            }
            setShowNotifPanel((v) => {
                const next = !v;
                if (next) void fetchNotifications();
                onDropdownChange?.(next);
                return next;
            });
        },
        [fetchNotifications, userId],
    );

    return {
        notifications,
        unreadCount,
        showNotifPanel,
        setShowNotifPanel,
        loadingNotifs,
        handleMarkAllRead,
        handleNotificationClick,
        handleBellClick,
    };
}
