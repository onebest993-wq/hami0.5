import type { ComponentProps, ComponentType } from 'react';

type NotificationPanelModule = typeof import('@/app/components/lawyer/NotificationPanel');
type NotificationPanelProps = ComponentProps<NotificationPanelModule['NotificationPanel']>;
export type NotificationPanelComponent = ComponentType<NotificationPanelProps>;

import {
    markNotificationPanelModuleResolved,
    resetNotificationPanelModuleStateForTests,
} from '@/app/runtime/notificationPanelModuleState';

export {
    isNotificationPanelModuleResolved,
    resetNotificationPanelModuleStateForTests,
} from '@/app/runtime/notificationPanelModuleState';

let panelModulePromise: Promise<NotificationPanelModule> | null = null;
let cachedNotificationPanel: NotificationPanelComponent | null = null;

export function getCachedNotificationPanel(): NotificationPanelComponent | null {
    return cachedNotificationPanel;
}

/** للاختبارات */
export function resetNotificationPanelModuleCacheForTests(): void {
    panelModulePromise = null;
    cachedNotificationPanel = null;
    resetNotificationPanelModuleStateForTests();
}

function ensurePanelModulePromise(): Promise<NotificationPanelModule> {
    if (!panelModulePromise) {
        panelModulePromise = import('@/app/components/lawyer/NotificationPanel')
            .then((mod) => {
                if (mod?.NotificationPanel) {
                    cachedNotificationPanel = mod.NotificationPanel;
                }
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
