import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNotificationStore } from '@/app/stores/notificationStore';
import {
    deriveNotificationCategory,
    type NotificationModel,
} from '@/app/infrastructure/NotificationRepository';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { TIMING } from '@/app/utils/constants';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import type { NotificationTab } from '@/app/components/lawyer/NotificationPanel/types';
import {
    isForumNotification,
    isSystemNotification,
} from '@/app/components/lawyer/NotificationPanel/utils/notificationFilters';
import { groupNotificationsByTime } from '@/app/components/lawyer/NotificationPanel/utils/timeGrouping';
import { useIncomingCaseShares } from '@/app/hooks/useIncomingCaseShares';

export function useNotificationPanel(
    isOpen: boolean,
    userId: string,
    onClose: () => void,
    onNavigate: (path: string, payload: Record<string, unknown>) => void,
) {
    const notifications = useNotificationStore((s) => s.notifications);
    const unreadCount = useNotificationStore((s) => s.unreadCount);
    const isLoading = useNotificationStore((s) => s.isLoading);
    const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
    const markAsRead = useNotificationStore((s) => s.markAsRead);
    const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

    const [activeTab, setActiveTab] = useState<NotificationTab>('forum');
    const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

    const {
        incoming: caseShareIncoming,
        shares: caseShareAll,
        pendingCount: caseSharePendingCount,
        refresh: refreshCaseShares,
    } = useIncomingCaseShares(userId, isOpen);

    const combinedUnreadCount = unreadCount + caseSharePendingCount;

    useEffect(() => {
        if (!isOpen || !userId) return;

        fetchNotifications(userId);

        let intervalId: ReturnType<typeof setInterval> | null = null;
        const startPolling = () => {
            if (intervalId != null) return;
            intervalId = setInterval(() => {
                fetchNotifications(userId);
            }, TIMING.NOTIFICATION_POLL);
        };
        const stopPolling = () => {
            if (intervalId != null) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        const isVisible = () =>
            typeof document === 'undefined' || document.visibilityState !== 'hidden';

        if (isVisible()) startPolling();

        const onVisibilityChange = () => {
            if (isVisible()) {
                fetchNotifications(userId);
                startPolling();
            } else {
                stopPolling();
            }
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisibilityChange);
        }

        return () => {
            stopPolling();
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibilityChange);
            }
        };
    }, [userId, isOpen, fetchNotifications]);

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

    const handleTap = useCallback(
        async (notification: NotificationModel) => {
            if (!notification.isRead) await markAsRead(userId, notification.id);
            onClose();
            const cat = deriveNotificationCategory(notification);
            const payload = notification.actionPayload ?? {};
            switch (cat) {
                case 'forum':
                    onNavigate('community', payload);
                    break;
                case 'document':
                    onNavigate('vault', payload);
                    break;
                case 'ai':
                    onNavigate('ai_drafter', payload);
                    break;
                default:
                    break;
            }
        },
        [markAsRead, onClose, onNavigate, userId],
    );

    const handleClientRequest = useCallback(
        async (e: MouseEvent, _notif: NotificationModel) => {
            e.stopPropagation();
            const clientPhone = await SmartDialog.prompt(
                'أدخل رقم هاتف الموكل (مثال: +9647800000000):',
                '',
            );
            if (!clientPhone) return;

            const message = 'أهلاً بك، يرجى إرسال صورة القيد أو سند الطابو لإكمال ملف دعواكم.';
            try {
                const data = await SecureAPIClient.fetchSecure<{ success?: boolean; error?: string }>(
                    '/api/comms-dispatcher',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ to: clientPhone, message, channel: 'whatsapp' }),
                    },
                );
                if (data.success) SmartToast.success('تم إرسال الطلب للموكل بنجاح (Simulation) ✅');
                else throw new Error(data.error);
            } catch {
                window.open(
                    `https://wa.me/${clientPhone.replace('+', '')}?text=${encodeURIComponent(message)}`,
                    '_blank',
                );
            }
        },
        [],
    );

    const handleScan = useCallback(
        (e: MouseEvent) => {
            e.stopPropagation();
            onClose();
            onNavigate('scan_document', {});
        },
        [onClose, onNavigate],
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

    return {
        activeTab,
        setActiveTab,
        unreadCount: combinedUnreadCount,
        isLoading,
        visibleNotifications,
        groupedByTime,
        tabCounts,
        isMarkingAllRead,
        caseShareIncoming: caseShareAll,
        refreshCaseShares,
        handleTap,
        handleScan,
        handleClientRequest,
        handleMarkAllRead,
    };
}
