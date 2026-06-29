import React, { memo, Suspense } from 'react';
import { LazyNotificationPanel } from '@/app/utils/lazyComponents';
import { NotificationPanelLoadingFallback } from '@/app/components/lawyer/LawyerDashboardParts/LazyFallback';
import { IncomingNotificationPopups } from '@/app/components/lawyer/NotificationPanel/components/IncomingNotificationPopups';
import { useIncomingNotificationPopups } from '@/app/hooks/lawyerDashboard/useIncomingNotificationPopups';
import { useNotificationShellLifecycle } from '@/app/hooks/lawyerDashboard/useNotificationShellLifecycle';
import { useNotificationMobileSuspend } from '@/app/hooks/lawyerDashboard/useNotificationMobileSuspend';
import { useNotificationStore } from '@/app/stores/notificationStore';

export type NotificationShellProps = {
    isOpen: boolean;
    panelSessionKey: number;
    userId: string;
    onClose: () => void;
    onNavigate: (path: string, payload: Record<string, unknown>) => void;
    onOpenPanel: () => void;
};

function NotificationShellInner({
    isOpen,
    panelSessionKey,
    userId,
    onClose,
    onNavigate,
    onOpenPanel,
}: NotificationShellProps) {
    const { queue, dismiss } = useIncomingNotificationPopups({
        userId,
        isPanelOpen: isOpen,
        enabled: Boolean(userId),
    });

    const hasLocalCache = useNotificationStore((s) => s.notifications.length > 0);
    useNotificationShellLifecycle(isOpen, userId, hasLocalCache);
    useNotificationMobileSuspend(isOpen);

    const handlePopupOpen = (id: string) => {
        dismiss(id);
        onOpenPanel();
    };

    return (
        <>
            <div data-hami-notification-shell="" hidden={!isOpen && queue.length === 0}>
            {userId && isOpen ? (
                <Suspense fallback={<NotificationPanelLoadingFallback onClose={onClose} />}>
                    <LazyNotificationPanel
                        key={`notification-panel-${panelSessionKey}`}
                        isOpen={isOpen}
                        panelSessionKey={panelSessionKey}
                        onClose={onClose}
                        userId={userId}
                        onNavigate={onNavigate}
                    />
                </Suspense>
            ) : null}
            </div>
            <IncomingNotificationPopups items={queue} onDismiss={dismiss} onOpen={handlePopupOpen} />
        </>
    );
}

export const NotificationShell = memo(NotificationShellInner);
