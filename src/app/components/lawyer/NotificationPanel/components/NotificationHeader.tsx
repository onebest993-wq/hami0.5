import React from 'react';
import type { NotificationPanelRoute } from '@/app/components/lawyer/NotificationPanel/notificationPanelRoute';
import { NotificationHeaderInbox } from '@/app/components/lawyer/NotificationPanel/components/NotificationHeaderInbox';
import { NotificationHeaderAlertControls } from '@/app/components/lawyer/NotificationPanel/components/NotificationHeaderAlertControls';
import { inertProps } from '@/app/utils/inertProps';

interface NotificationHeaderProps {
    panelRoute?: NotificationPanelRoute;
    unreadCount: number;
    showHeaderBusy?: boolean;
    isMarkingAllRead: boolean;
    onMarkAllRead: () => void;
    onClose: () => void;
    showDragHandle?: boolean;
    isAlertsMuted?: boolean;
    onPrefetchAlertControls?: () => void;
    onNavigateToAlertControls?: () => void;
    onBackToInbox?: () => void;
}

/** الهيدران مركّبان داخل نفس الورقة — التبديل بلا هدم الستارة */
export function NotificationHeader({
    panelRoute = 'inbox',
    unreadCount,
    showHeaderBusy = false,
    isMarkingAllRead,
    onMarkAllRead,
    onClose,
    showDragHandle = false,
    isAlertsMuted = false,
    onPrefetchAlertControls,
    onNavigateToAlertControls,
    onBackToInbox,
}: NotificationHeaderProps) {
    const inboxActive = panelRoute !== 'alert-controls';

    return (
        <div className="hami-notif-header-switch" data-route={panelRoute}>
            <div
                className="hami-notif-header-pane"
                data-active={inboxActive ? 'true' : 'false'}
                aria-hidden={!inboxActive}
                {...inertProps(!inboxActive)}
            >
                <NotificationHeaderInbox
                    unreadCount={unreadCount}
                    showHeaderBusy={showHeaderBusy}
                    isMarkingAllRead={isMarkingAllRead}
                    onMarkAllRead={onMarkAllRead}
                    onClose={onClose}
                    showDragHandle={showDragHandle}
                    isAlertsMuted={isAlertsMuted}
                    onPrefetchAlertControls={onPrefetchAlertControls}
                    onNavigateToAlertControls={onNavigateToAlertControls}
                />
            </div>
            <div
                className="hami-notif-header-pane"
                data-active={inboxActive ? 'false' : 'true'}
                aria-hidden={inboxActive}
                {...inertProps(inboxActive)}
            >
                <NotificationHeaderAlertControls
                    isAlertsMuted={isAlertsMuted}
                    onClose={onClose}
                    onBackToInbox={onBackToInbox}
                />
            </div>
        </div>
    );
}
