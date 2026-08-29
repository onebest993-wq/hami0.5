import React, { useLayoutEffect } from 'react';
import type { NotificationPanelProps } from '@/app/components/lawyer/NotificationPanel/types';
import { NotificationPanel } from '@/app/components/lawyer/NotificationPanel/index';
import { hydrateNotificationShellForInstantOpen } from '@/app/runtime/notificationBootHydrator';
import { useNotificationStore } from '@/app/stores/notificationStore';

export type NotificationPanelHostProps = NotificationPanelProps & {
    /** يبقي اللوحة mounted بعد الإغلاق — فتح/إغلاق أسرع */
    keepAlive?: boolean;
};

/**
 * Host — اللوحة sync في نفس مقطع الشِل (مثل إعدادات Host→App).
 * بلا هيكل تحميل ثم استبدال المحتوى.
 */
export function NotificationPanelHost({
    keepAlive = false,
    isOpen,
    onClose,
    userId,
    ...rest
}: NotificationPanelHostProps): React.ReactElement | null {
    const shouldMount = isOpen || keepAlive;

    useLayoutEffect(() => {
        if (!shouldMount) return;
        /* بعد commit الشِل وقبل الطلاء — لا setState أثناء رندر الـ Host (كان يحدّث NotificationShellInner) */
        if (userId) {
            useNotificationStore.getState().hydrateFromLocalPeek(userId);
        }
        void hydrateNotificationShellForInstantOpen(true);
    }, [shouldMount, userId]);

    if (!shouldMount) {
        return null;
    }

    return (
        <NotificationPanel
            isOpen={isOpen}
            keepAlive={keepAlive}
            onClose={onClose}
            userId={userId}
            {...rest}
        />
    );
}
