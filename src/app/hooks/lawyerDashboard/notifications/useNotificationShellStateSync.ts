import { useEffect, useLayoutEffect, useRef, type MutableRefObject } from 'react';

import { hasLocalAppSession } from '@/app/services/auth/shellAuth';
import { concealNotificationWarmPanel } from '@/app/runtime/notificationInstantPaint';
import { persistNotificationsSessionOpen } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import {
    NOTIFICATION_SHELL_SNAP_EVENT,
    readNotificationShellSnapState,
    snapNotificationShellClose,
} from '@/app/services/notifications/notificationShellSnap';

export type NotificationShellStateSyncParams = {
    userId: string | null;
    initialSessionOpen: boolean;
    showNotifications: boolean;
    showNotificationsRef: MutableRefObject<boolean>;
    /** فتح طائر أو حركة خروج جارية — لا تُقاطع أيّاً منهما */
    isBusy: () => boolean;
    closingRef: MutableRefObject<boolean>;
    setShowNotifications: (open: boolean) => void;
};

/**
 * اتساق حالة اللوحة مع محيطها: علم الجلسة، غياب الجلسة، وغياب الستارة.
 * الإغلاق المُتحرِّك يبقى بيد closeNotifications — هنا لا نلمس سمة closing.
 */
export function useNotificationShellStateSync(params: NotificationShellStateSyncParams): void {
    const {
        userId,
        initialSessionOpen,
        showNotifications,
        showNotificationsRef,
        closingRef,
        setShowNotifications,
    } = params;
    const latest = useRef(params);
    latest.current = params;

    useEffect(() => {
        persistNotificationsSessionOpen(showNotifications);
    }, [showNotifications]);

    useEffect(() => {
        if (hasLocalAppSession(userId)) return;
        if (!showNotificationsRef.current && !initialSessionOpen) return;
        snapNotificationShellClose();
        concealNotificationWarmPanel();
        showNotificationsRef.current = false;
        closingRef.current = false;
        setShowNotifications(false);
        persistNotificationsSessionOpen(false);
    }, [userId, initialSessionOpen, showNotificationsRef, closingRef, setShowNotifications]);

    useLayoutEffect(() => {
        const syncClosedWhenSnapGone = () => {
            const current = latest.current;
            if (current.isBusy() || !current.showNotificationsRef.current) return;
            const snap = readNotificationShellSnapState();
            if (snap.open || snap.closing) return;
            /* ستارة أُطفئت دون setState — aria-modal يبقى فوق الرئيسية حتى تُطفأ React */
            current.showNotificationsRef.current = false;
            current.setShowNotifications(false);
            persistNotificationsSessionOpen(false);
            concealNotificationWarmPanel();
        };
        syncClosedWhenSnapGone();
        if (typeof window === 'undefined') return;
        window.addEventListener(NOTIFICATION_SHELL_SNAP_EVENT, syncClosedWhenSnapGone);
        return () =>
            window.removeEventListener(NOTIFICATION_SHELL_SNAP_EVENT, syncClosedWhenSnapGone);
    }, []);
}
