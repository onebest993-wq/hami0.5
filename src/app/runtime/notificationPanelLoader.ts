type NotificationPanelModule = typeof import('@/app/components/lawyer/NotificationPanel');

let panelModulePromise: Promise<NotificationPanelModule> | null = null;

export function prefetchNotificationPanel(): void {
    if (typeof window === 'undefined') return;
    if (!panelModulePromise) {
        panelModulePromise = import('@/app/components/lawyer/NotificationPanel');
    }
}

export function loadNotificationPanelModule(): Promise<NotificationPanelModule> {
    prefetchNotificationPanel();
    return panelModulePromise!;
}
