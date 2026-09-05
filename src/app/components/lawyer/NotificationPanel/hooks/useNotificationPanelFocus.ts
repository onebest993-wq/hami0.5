import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotificationStore } from '@/app/stores/notificationStore';
import type { NotificationTab } from '@/app/components/lawyer/NotificationPanel/types';
import { isSystemNotification } from '@/app/components/lawyer/NotificationPanel/utils/notificationFilters';
import {
    consumeNotificationPanelFocusId,
    highlightNotificationCard,
    NOTIFICATION_FOCUS_RETRY_MS,
} from '@/app/services/notifications/notificationPanelFocus';
import { HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT } from '@/app/services/notifications/notificationOsTapEvents';

/**
 * تركيز بطاقة إشعار بعد فتح اللوحة من منبثق / نقر نظام التشغيل.
 * المعرّف يبقى حتى العثور على البطاقة أو مهلة إعادة المحاولة — لا يُسقط بعد 120ms أثناء التحميل.
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
        const started = Date.now();
        let timer = 0;
        const tick = () => {
            if (highlightNotificationCard(id)) {
                setFocusNotificationId(null);
                return;
            }
            if (Date.now() - started >= NOTIFICATION_FOCUS_RETRY_MS) {
                setFocusNotificationId(null);
                return;
            }
            timer = window.setTimeout(tick, 50);
        };
        timer = window.setTimeout(tick, 0);
        return () => window.clearTimeout(timer);
        // notificationsLength / activeTab: إعادة المحاولة بعد وصول القائمة أو تبديل التبويب
    }, [focusNotificationId, isOpen, activeTab, notificationsLength]);

    return { focusNotificationId };
}
