import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotificationStore } from '@/app/stores/notificationStore';
import type { NotificationTab } from '@/app/components/lawyer/NotificationPanel/types';
import { isSystemNotification } from '@/app/components/lawyer/NotificationPanel/utils/notificationFilters';
import { consumeNotificationPanelFocusId } from '@/app/services/notifications/notificationPanelFocus';
import { HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT } from '@/app/services/notifications/notificationOsTapEvents';

/**
 * تركيز بطاقة إشعار بعد فتح اللوحة من منبثق / نقر نظام التشغيل.
 */
export function useNotificationPanelFocus(
    isOpen: boolean,
    activeTab: NotificationTab,
    setActiveTab: (tab: NotificationTab) => void,
    notificationsLength: number,
) {
    const [focusNotificationId, setFocusNotificationId] = useState<string | null>(null);
    const wasOpenRef = useRef(false);

    const applyFocusId = useCallback(
        (focusId: string | null) => {
            if (!focusId) {
                setFocusNotificationId(null);
                return;
            }
            const target = useNotificationStore.getState().notifications.find((n) => n.id === focusId);
            if (target && isSystemNotification(target)) {
                setActiveTab('system');
            } else {
                setActiveTab('forum');
            }
            setFocusNotificationId(focusId);
        },
        [setActiveTab],
    );

    useEffect(() => {
        if (isOpen && !wasOpenRef.current) {
            const focusId = consumeNotificationPanelFocusId();
            if (focusId) {
                applyFocusId(focusId);
            } else {
                setActiveTab('forum');
                setFocusNotificationId(null);
            }
        }
        if (!isOpen) {
            setFocusNotificationId(null);
        }
        wasOpenRef.current = isOpen;
    }, [applyFocusId, isOpen, setActiveTab]);

    useEffect(() => {
        if (!isOpen) return;
        const onOsOpenPanel = () => {
            applyFocusId(consumeNotificationPanelFocusId());
        };
        window.addEventListener(HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT, onOsOpenPanel);
        return () => window.removeEventListener(HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT, onOsOpenPanel);
    }, [applyFocusId, isOpen]);

    useEffect(() => {
        if (!isOpen || !focusNotificationId) return;
        const id = focusNotificationId;
        const t = window.setTimeout(() => {
            const el = document.querySelector(
                `[data-testid="notification-card-${CSS.escape(id)}"]`,
            );
            if (el instanceof HTMLElement) {
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                el.setAttribute('data-hami-notif-focus', 'true');
                window.setTimeout(() => el.removeAttribute('data-hami-notif-focus'), 2_400);
            }
            setFocusNotificationId(null);
        }, 120);
        return () => window.clearTimeout(t);
        // notificationsLength: إعادة المحاولة بعد وصول القائمة
    }, [focusNotificationId, isOpen, activeTab, notificationsLength]);

    return { focusNotificationId };
}
