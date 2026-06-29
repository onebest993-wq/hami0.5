import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNotificationStore } from '@/app/stores/notificationStore';
import type { NotificationTab } from '@/app/components/lawyer/NotificationPanel/types';
import {
    isForumNotification,
    isSystemNotification,
} from '@/app/components/lawyer/NotificationPanel/utils/notificationFilters';
import { groupNotificationsByTime } from '@/app/components/lawyer/NotificationPanel/utils/timeGrouping';
import { useIncomingCaseShares } from '@/app/hooks/useIncomingCaseShares';
import { useNotificationPolling } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationPolling';
import { useNotificationActions } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationActions';

export function useNotificationPanel(
    isOpen: boolean,
    userId: string,
    panelSessionKey: number,
    onClose: () => void,
    onNavigate: (path: string, payload: Record<string, unknown>) => void,
) {
    const notifications = useNotificationStore((s) => s.notifications);
    const unreadCount = useNotificationStore((s) => s.unreadCount);
    const isLoading = useNotificationStore((s) => s.isLoading);
    const markAsRead = useNotificationStore((s) => s.markAsRead);
    const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

    const [activeTab, setActiveTab] = useState<NotificationTab>('forum');
    const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

    useEffect(() => {
        setActiveTab('forum');
    }, [panelSessionKey]);

    useNotificationPolling(isOpen, userId);

    const {
        incoming: caseShareIncoming,
        shares: caseShareAll,
        pendingCount: caseSharePendingCount,
        refresh: refreshCaseShares,
    } = useIncomingCaseShares(userId, isOpen);

    const combinedUnreadCount = unreadCount + caseSharePendingCount;

    const { handleTap, handleScan, handleClientRequest } = useNotificationActions(
        userId,
        onClose,
        onNavigate,
        markAsRead,
    );

    const visibleNotifications = useMemo(() => {
        if (activeTab === 'forum') return notifications.filter(isForumNotification);
        return notifications.filter(isSystemNotification);
    }, [notifications, activeTab]);

    const groupedByTime = useMemo(
        () => groupNotificationsByTime(visibleNotifications),
        [visibleNotifications],
    );

    const tabCounts = useMemo(() => {
        const forum = notifications.filter((n) => !n.isRead && isForumNotification(n)).length;
        const system = notifications.filter((n) => !n.isRead && isSystemNotification(n)).length;
        return { forum, system };
    }, [notifications]);

    const handleMarkAllRead = useCallback(async () => {
        if (!userId || isMarkingAllRead) return;
        setIsMarkingAllRead(true);
        try {
            await markAllAsRead(userId);
        } finally {
            setIsMarkingAllRead(false);
        }
    }, [userId, isMarkingAllRead, markAllAsRead]);

    const hasCaseShareContent = useMemo(() => {
        const pendingIncoming = caseShareAll.filter(
            (s) => s.recipientId === userId && s.status === 'pending',
        );
        const activeSessions = caseShareAll.filter(
            (s) => s.status === 'accepted' && (s.ownerId === userId || s.recipientId === userId),
        );
        const recentEnded = caseShareAll
            .filter(
                (s) => s.status === 'ended' && (s.ownerId === userId || s.recipientId === userId),
            )
            .slice(0, 5);
        return pendingIncoming.length > 0 || activeSessions.length > 0 || recentEnded.length > 0;
    }, [caseShareAll, userId]);

    return {
        activeTab,
        setActiveTab,
        unreadCount: combinedUnreadCount,
        isLoading,
        hasCachedNotifications: notifications.length > 0,
        visibleNotifications,
        groupedByTime,
        tabCounts,
        isMarkingAllRead,
        caseShareIncoming: caseShareAll,
        hasCaseShareContent,
        refreshCaseShares,
        handleTap,
        handleScan,
        handleClientRequest,
        handleMarkAllRead,
    };
}
