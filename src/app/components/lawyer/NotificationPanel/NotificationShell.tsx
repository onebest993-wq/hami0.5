import React, { memo } from 'react';
import { NotificationPanelHost } from '@/app/components/lawyer/NotificationPanel/NotificationPanelHost';
import { IncomingNotificationPopups } from '@/app/components/lawyer/NotificationPanel/components/IncomingNotificationPopups';
import { useIncomingNotificationPopups } from '@/app/hooks/lawyerDashboard/useIncomingNotificationPopups';
import { useNotificationShellLifecycle } from '@/app/hooks/lawyerDashboard/useNotificationShellLifecycle';
import { useNotificationMobileSuspend } from '@/app/hooks/lawyerDashboard/useNotificationMobileSuspend';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { inertProps } from '@/app/utils/inertProps';
import './notificationPanel.css';

export type NotificationShellProps = {
    isOpen: boolean;
    /** Host مركّب للتسخين/المنبثقات حتى لو اللوحة مغلقة */
    hostMounted?: boolean;
    panelSessionKey: number;
    userId: string;
    onClose: () => void;
    onNavigate: (path: string, payload: Record<string, unknown>) => void;
    onOpenPanel: () => void;
};

function NotificationShellInner({
    isOpen,
    hostMounted = true,
    panelSessionKey,
    userId,
    onClose,
    onNavigate,
    onOpenPanel,
}: NotificationShellProps) {
    const shellEnabled = Boolean(userId) && (hostMounted || isOpen);
    const { queue, dismiss } = useIncomingNotificationPopups({
        userId,
        isPanelOpen: isOpen,
        enabled: shellEnabled,
    });

    const hasLocalCache = useNotificationStore((s) => s.notifications.length > 0);
    useNotificationShellLifecycle(isOpen, userId, hasLocalCache);
    useNotificationMobileSuspend(isOpen);

    const handlePopupOpen = (id: string) => {
        dismiss(id);
        onOpenPanel();
    };

    if (!shellEnabled && queue.length === 0) {
        return null;
    }

    return (
        <>
            <div
                data-notification-root=""
                data-hami-notification-shell=""
                data-open={isOpen ? 'true' : 'false'}
                className={
                    isOpen
                        ? 'hami-notif-layer hami-notif-layer--visible'
                        : 'hami-notif-layer'
                }
                aria-hidden={!isOpen}
                {...inertProps(!isOpen)}
            >
                {userId && isOpen ? (
                    <NotificationPanelHost
                        key={`notification-panel-${panelSessionKey}`}
                        isOpen={isOpen}
                        panelSessionKey={panelSessionKey}
                        onClose={onClose}
                        userId={userId}
                        onNavigate={onNavigate}
                    />
                ) : null}
            </div>
            <IncomingNotificationPopups items={queue} onDismiss={dismiss} onOpen={handlePopupOpen} />
        </>
    );
}

export const NotificationShell = memo(NotificationShellInner);
