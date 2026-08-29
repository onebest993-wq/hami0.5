import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { ForumNotification } from '@/app/services/lawyer-cloud';
import { ForumApiService } from '@/app/services/forumApiService';
import { sortForumNotificationsByDate } from './forumAppBarNotificationSnapshot';

type UseForumAppBarNotificationActionsArgs = {
    userId: string | null | undefined;
    lastUnreadRef: MutableRefObject<number>;
    seenNotifIdsRef: MutableRefObject<Set<string>>;
    setNotifications: Dispatch<SetStateAction<ForumNotification[]>>;
    setUnreadCount: Dispatch<SetStateAction<number>>;
    setShowNotifPanel: Dispatch<SetStateAction<boolean>>;
    fetchNotifications: (options?: { background?: boolean }) => Promise<void>;
    seedNotificationsFromLocal: (targetUserId: string) => boolean;
    onNavigateToPost?: (postId: string) => void;
    onSectionChange?: (section: 'forum') => void;
};

export function useForumAppBarNotificationActions({
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
}: UseForumAppBarNotificationActionsArgs) {
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
    }, [lastUnreadRef, setNotifications, setUnreadCount, userId]);

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
        [lastUnreadRef, onNavigateToPost, onSectionChange, setNotifications, setShowNotifPanel, setUnreadCount, userId],
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
                setNotifications((prev) => sortForumNotificationsByDate([notif, ...prev]).slice(0, 25));
                if (wasUnread) {
                    setUnreadCount((count) => count + 1);
                    lastUnreadRef.current += 1;
                }
                SmartToast.error('تعذّر إزالة التنبيه');
            }
        },
        [lastUnreadRef, seenNotifIdsRef, setNotifications, setUnreadCount, userId],
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
        [fetchNotifications, seedNotificationsFromLocal, setShowNotifPanel, userId],
    );

    return {
        handleMarkAllRead,
        handleNotificationClick,
        handleNotificationDismiss,
        handleBellClick,
    };
}
