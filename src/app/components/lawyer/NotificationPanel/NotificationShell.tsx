import React, { memo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { NotificationPanelHost } from '@/app/components/lawyer/NotificationPanel/NotificationPanelHost';
import { IncomingNotificationPopups } from '@/app/components/lawyer/NotificationPanel/components/IncomingNotificationPopups';
import { useIncomingNotificationPopups } from '@/app/hooks/lawyerDashboard/useIncomingNotificationPopups';
import { useNotificationShellLifecycle } from '@/app/hooks/lawyerDashboard/useNotificationShellLifecycle';
import { useNotificationMobileSuspend } from '@/app/hooks/lawyerDashboard/useNotificationMobileSuspend';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { inertProps } from '@/app/utils/inertProps';
import { reconcileClosedOverlayLayers } from '@/app/runtime/overlayLayerHygiene';
import './notificationPanel.css';

export type NotificationShellProps = {
    isOpen: boolean;
    /** Host مركّب للتسخين/المنبثقات حتى لو اللوحة مغلقة */
    hostMounted?: boolean;
    userId: string;
    onClose: () => void;
    onNavigate: (path: string, payload: Record<string, unknown>) => void;
    onOpenPanel: () => void;
};

function NotificationShellInner({
    isOpen,
    hostMounted = true,
    userId,
    onClose,
    onNavigate,
    onOpenPanel,
}: NotificationShellProps) {
    const popupsEnabled = Boolean(userId);
    const panelEnabled = popupsEnabled && (hostMounted || isOpen);
    const { queue, dismiss } = useIncomingNotificationPopups({
        userId,
        isPanelOpen: isOpen,
        enabled: popupsEnabled,
    });

    const hasLocalCache = useNotificationStore((s) => s.notifications.length > 0);
    useNotificationShellLifecycle(isOpen, userId, hasLocalCache);
    useNotificationMobileSuspend(isOpen);

    useLayoutEffect(() => {
        if (isOpen) return;
        reconcileClosedOverlayLayers();
    }, [isOpen]);

    const handlePopupOpen = (id: string) => {
        dismiss(id);
        void import('@/app/services/notifications/notificationPanelFocus').then((m) => {
            m.stashNotificationPanelFocusId(id);
        });
        onOpenPanel();
    };

    const layer = panelEnabled ? (
        <div
            data-notification-root=""
            data-hami-notification-shell=""
            data-hami-overlay-safe={isOpen ? '1' : undefined}
            data-open={isOpen ? 'true' : 'false'}
            className={
                isOpen
                    ? 'hami-notif-layer hami-notif-layer--visible'
                    : 'hami-notif-layer'
            }
            aria-hidden={!isOpen}
            {...inertProps(!isOpen)}
        >
            <NotificationPanelHost
                keepAlive={hostMounted}
                isOpen={isOpen}
                onClose={onClose}
                userId={userId}
                onNavigate={onNavigate}
            />
        </div>
    ) : null;

    return (
        <>
            {layer && typeof document !== 'undefined' ? createPortal(layer, document.body) : layer}
            {popupsEnabled ? (
                <IncomingNotificationPopups items={queue} onDismiss={dismiss} onOpen={handlePopupOpen} />
            ) : null}
        </>
    );
}

export const NotificationShell = memo(NotificationShellInner);
