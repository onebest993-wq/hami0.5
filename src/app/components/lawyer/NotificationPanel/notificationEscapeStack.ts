export type NotificationEscapeSnapshot = {
    smartDialogOpen: boolean;
    alertControlsOpen: boolean;
};

export type NotificationEscapeAction = 'dismiss-dialog' | 'back-to-inbox' | 'close-panel';

export function resolveNotificationEscapeAction(
    snapshot: NotificationEscapeSnapshot,
): NotificationEscapeAction {
    if (snapshot.smartDialogOpen) return 'dismiss-dialog';
    if (snapshot.alertControlsOpen) return 'back-to-inbox';
    return 'close-panel';
}
