import {
    markNotificationPanelModuleResolved,
    resetNotificationPanelModuleStateForTests,
} from '@/app/runtime/notificationPanelModuleState';

export {
    isNotificationPanelModuleResolved,
    resetNotificationPanelModuleStateForTests,
} from '@/app/runtime/notificationPanelModuleState';

type NotificationPanelModule = typeof import('@/app/components/lawyer/NotificationPanel');

let panelModulePromise: Promise<NotificationPanelModule> | null = null;

/** للاختبارات */
export function resetNotificationPanelModuleCacheForTests(): void {
    panelModulePromise = null;
    resetNotificationPanelModuleStateForTests();
}

function ensurePanelModulePromise(): Promise<NotificationPanelModule> {
    if (!panelModulePromise) {
        panelModulePromise = import('@/app/components/lawyer/NotificationPanel')
            .then((mod) => {
                markNotificationPanelModuleResolved();
                return mod;
            })
            .catch((err) => {
                panelModulePromise = null;
                throw err;
            });
    }
    return panelModulePromise;
}

export function prefetchNotificationPanel(): void {
    if (typeof window === 'undefined') return;
    void ensurePanelModulePromise().catch(() => undefined);
}

export function loadNotificationPanelModule(): Promise<NotificationPanelModule> {
    return ensurePanelModulePromise();
}

/** يضمن جاهزية لوحة الإشعارات للفتح الفوري */
export function hydrateNotificationPanelForInstantOpen(): Promise<boolean> {
    return ensurePanelModulePromise()
        .then(() => true)
        .catch(() => false);
}
