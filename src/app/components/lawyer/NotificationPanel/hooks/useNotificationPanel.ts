import { useCallback, useMemo, useState } from 'react';
import { useNotificationStore } from '@/app/stores/notificationStore';
import type { NotificationTab } from '@/app/components/lawyer/NotificationPanel/types';
import {
    EMPTY_NOTIFICATION_TIME_GROUPS,
    groupNotificationsByTime,
} from '@/app/components/lawyer/NotificationPanel/utils/timeGrouping';
import { partitionCaseShareForPanel } from '@/app/components/lawyer/NotificationPanel/utils/partitionCaseShareForPanel';
import { selectNotificationTabView } from '@/app/components/lawyer/NotificationPanel/utils/selectNotificationTabView';
import { useIncomingCaseShares } from '@/app/hooks/useIncomingCaseShares';
import { useNotificationPolling } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationPolling';
import { useNotificationActions } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationActions';
import { useNotificationPanelFocus } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelFocus';

export function useNotificationPanel(
    isOpen: boolean,
    userId: string,
    onClose: () => void,
    onNavigate: (path: string, payload: Record<string, unknown>) => void,
) {
    const notifications = useNotificationStore((s) => s.notifications);
    const unreadCount = useNotificationStore((s) => s.unreadCount);
    const isLoading = useNotificationStore((s) => s.isLoading);
    const hasHydratedOnce = useNotificationStore((s) => s.hasHydratedOnce);
    const markAsRead = useNotificationStore((s) => s.markAsRead);
    const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

    const [activeTab, setActiveTab] = useState<NotificationTab>('forum');
    const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

    const { focusNotificationId } = useNotificationPanelFocus(
        isOpen,
        activeTab,
        setActiveTab,
        notifications.length,
    );

    useNotificationPolling(isOpen, userId);

    const {
        shares: caseShareAll,
        pendingCount: caseSharePendingCount,
        refresh: refreshCaseShares,
    } = useIncomingCaseShares(userId, isOpen);

    const combinedUnreadCount = unreadCount + caseSharePendingCount;

    const { handleTap, handleScan } = useNotificationActions(
        userId,
        onClose,
        onNavigate,
        markAsRead,
    );

    const { visibleNotifications, tabCounts } = useMemo(
        () => selectNotificationTabView(notifications, activeTab),
        [notifications, activeTab],
    );

    const groupedByTime = useMemo(
        () =>
            isOpen
                ? groupNotificationsByTime(visibleNotifications)
                : EMPTY_NOTIFICATION_TIME_GROUPS,
        [isOpen, visibleNotifications],
    );

    const handleMarkAllRead = useCallback(async () => {
        if (!userId || isMarkingAllRead) return;
        setIsMarkingAllRead(true);
        try {
            await markAllAsRead(userId);
        } finally {
            setIsMarkingAllRead(false);
        }
    }, [userId, isMarkingAllRead, markAllAsRead]);

    const hasCaseShareContent = useMemo(
        () => partitionCaseShareForPanel(caseShareAll, userId).hasContent,
        [caseShareAll, userId],
    );

    return {
        activeTab,
        setActiveTab,
        unreadCount: combinedUnreadCount,
        isLoading,
        hasCachedNotifications: notifications.length > 0,
        hasHydratedOnce,
        visibleNotifications,
        groupedByTime,
        tabCounts,
        isMarkingAllRead,
        caseShareAll,
        hasCaseShareContent,
        refreshCaseShares,
        focusNotificationId,
        handleTap,
        handleScan,
        handleMarkAllRead,
    };
}
