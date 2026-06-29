type NotificationPanelModule = typeof import('@/app/components/lawyer/NotificationPanel');

import {
    markNotificationPanelModuleResolved,
    resetNotificationPanelModuleStateForTests,
} from '@/app/runtime/notificationPanelModuleState';

export { isNotificationPanelModuleResolved, resetNotificationPanelModuleStateForTests } from '@/app/runtime/notificationPanelModuleState';

let panelModulePromise: Promise<NotificationPanelModule> | null = null;

function ensurePanelModulePromise(): Promise<NotificationPanelModule> {
    if (!panelModulePromise) {
        panelModulePromise = import('@/app/components/lawyer/NotificationPanel').then((mod) => {
            markNotificationPanelModuleResolved();
            return mod;
        });
    }
    return panelModulePromise;
}

export function prefetchNotificationPanel(): void {
    if (typeof window === 'undefined') return;
    void ensurePanelModulePromise();
}

export function loadNotificationPanelModule(): Promise<NotificationPanelModule> {
    return ensurePanelModulePromise();
}
