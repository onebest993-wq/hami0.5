import { useCallback, useEffect, useState } from 'react';
import {
    isNotificationInboxRoute,
    type NotificationPanelRoute,
} from '@/app/components/lawyer/NotificationPanel/notificationPanelRoute';
import { prefetchNotificationAlertControls } from '@/app/components/lawyer/NotificationPanel/notificationPanelLazyModules';

/**
 * مسار الوارد ↔ تحكم التنبيهات.
 * تسخين مقطع التحكم عند لمس الزر فقط — لا مع كل فتح للوارد.
 */
export function useNotificationPanelRoute(isOpen: boolean) {
    const [panelRoute, setPanelRoute] = useState<NotificationPanelRoute>('inbox');
    const isInboxRoute = isNotificationInboxRoute(panelRoute);

    useEffect(() => {
        if (!isOpen) setPanelRoute('inbox');
    }, [isOpen]);

    const navigateToAlertControls = useCallback(() => {
        prefetchNotificationAlertControls();
        setPanelRoute('alert-controls');
        /* صوت الوصول لا يحجب التنقّل */
        void import('@/app/services/notifications/notificationArrivalSound')
            .then((m) => m.primeNotificationArrivalAudio())
            .catch(() => undefined);
    }, []);

    const backToInbox = useCallback(() => {
        setPanelRoute('inbox');
    }, []);

    return {
        panelRoute,
        isInboxRoute,
        navigateToAlertControls,
        backToInbox,
        prefetchAlertControls: prefetchNotificationAlertControls,
    };
}
