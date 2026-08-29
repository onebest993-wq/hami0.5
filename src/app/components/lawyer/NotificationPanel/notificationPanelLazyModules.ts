/** تحميل مؤجّل لأجزاء لوحة الإشعارات الثقيلة — لا تُسحب مع فتح الوارد. */

import type { ComponentType } from 'react';

type AlertControlsModule = typeof import('@/app/components/lawyer/NotificationPanel/components/NotificationAlertControls');

let alertControlsPromise: Promise<AlertControlsModule> | null = null;
let cachedAlertControls: AlertControlsModule['NotificationAlertControls'] | null = null;

export function loadNotificationAlertControlsModule() {
    if (!alertControlsPromise) {
        alertControlsPromise = import(
            '@/app/components/lawyer/NotificationPanel/components/NotificationAlertControls'
        ).then((mod) => {
            cachedAlertControls = mod.NotificationAlertControls;
            return mod;
        });
    }
    return alertControlsPromise;
}

export function getCachedNotificationAlertControls(): ComponentType | null {
    return cachedAlertControls;
}

export function prefetchNotificationAlertControls(): void {
    void loadNotificationAlertControlsModule();
}

export function loadCaseSharePanelSectionModule() {
    return import('@/app/components/lawyer/NotificationPanel/components/CaseSharePanelSection');
}
