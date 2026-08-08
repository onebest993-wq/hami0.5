import { useEffect } from 'react';
import { initializeHamiNotificationBridge } from '@/app/services/notifications/HamiNotificationBridge';

/** تهيئة جسر الإشعارات الأصلي + الاستماع للأحداث */
export function useNativeNotificationRuntime(enabled: boolean): void {
    useEffect(() => {
        if (!enabled) return;

        void initializeHamiNotificationBridge();
    }, [enabled]);
}
