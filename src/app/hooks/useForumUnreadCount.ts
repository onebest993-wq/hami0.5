import { useCallback, useEffect, useState } from 'react';
import { ForumApiService } from '@/app/services/forumApiService';
import {
    emitForumUnreadCount,
    FORUM_UNREAD_CHANGED_EVENT,
    syncForumNotificationsToAppStore,
} from '@/app/services/forum/forumNotificationBridge';
import { ForumNotificationStreamService } from '@/app/services/forum/ForumNotificationStreamService';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';

/** عدّاد تنبيهات المنتدى غير المقروءة — للشارة على بطاقة الرئيسية */
export function useForumUnreadCount(userId: string | null, enabled = true): number {
    const [count, setCount] = useState(0);

    const refresh = useCallback(async () => {
        if (!userId) {
            setCount(0);
            emitForumUnreadCount(0);
            return;
        }
        try {
            const { notifications, unreadCount } = await ForumApiService.listForumNotifications(userId);
            syncForumNotificationsToAppStore(userId, notifications);
            setCount(unreadCount);
            emitForumUnreadCount(unreadCount);
        } catch {
            /* silent */
        }
    }, [userId]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    useVisibilityAwareInterval(() => {
        void refresh();
    }, ForumNotificationStreamService.isRunning() ? 45_000 : 12_000, enabled && Boolean(userId));

    useEffect(() => {
        const onExternal = (e: Event) => {
            const detail = (e as CustomEvent<{ count: number; refresh?: boolean }>).detail;
            if (typeof detail?.count === 'number') setCount(detail.count);
            if (detail?.refresh) void refresh();
        };
        window.addEventListener(FORUM_UNREAD_CHANGED_EVENT, onExternal);
        return () => window.removeEventListener(FORUM_UNREAD_CHANGED_EVENT, onExternal);
    }, [refresh]);

    return count;
}
