import { useCallback } from 'react';
import { resolveNotificationEscapeAction } from '@/app/components/lawyer/NotificationPanel/notificationEscapeStack';
import { dismissActiveSmartDialog, isSmartDialogOpen } from '@/app/components/ui/smartDialogBus';

function isAlertControlsRouteInDom(): boolean {
    if (typeof document === 'undefined') return false;
    const panel = document.querySelector('[data-testid="notification-panel"]');
    return panel?.getAttribute('data-notification-route') === 'alert-controls';
}

export function useNotificationLayeredEscape(
    isInboxRoute: boolean,
    backToInbox: () => void,
    onClose: () => void,
) {
    return useCallback(() => {
        const action = resolveNotificationEscapeAction({
            smartDialogOpen: isSmartDialogOpen(),
            alertControlsOpen: !isInboxRoute || isAlertControlsRouteInDom(),
        });
        if (action === 'dismiss-dialog') {
            dismissActiveSmartDialog();
            return;
        }
        if (action === 'back-to-inbox') {
            backToInbox();
            return;
        }
        onClose();
    }, [backToInbox, isInboxRoute, onClose]);
}
