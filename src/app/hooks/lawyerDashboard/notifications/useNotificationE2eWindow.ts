import { useEffect, type MutableRefObject } from 'react';
import { isViteE2eHooksEnabled } from '@/app/utils/viteE2eHooks';
import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { commitNotificationShellOpen } from '@/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow';

export function useNotificationE2eWindow(params: {
    userId: string | null;
    closeNotifications: () => void;
    openInFlightRef: MutableRefObject<boolean>;
    showNotificationsRef: MutableRefObject<boolean>;
    notificationHostMountedRef: MutableRefObject<boolean>;
    setNotificationHostMounted: (mounted: boolean) => void;
    setShowNotifications: (open: boolean) => void;
}): void {
    const {
        userId,
        closeNotifications,
        openInFlightRef,
        showNotificationsRef,
        notificationHostMountedRef,
        setNotificationHostMounted,
        setShowNotifications,
    } = params;

    useEffect(() => {
        if (!isViteE2eHooksEnabled() || typeof window === 'undefined') return;
        const w = window as Window & {
            __hamiE2eForceCloseNotifications?: () => void;
            __hamiE2eForceOpenNotifications?: () => void;
            __hamiE2eNotificationDebug?: () => {
                showNotifications: boolean;
                notificationPanelMounted: boolean;
            };
        };
        w.__hamiE2eForceCloseNotifications = () => {
            closeNotifications();
        };
        w.__hamiE2eForceOpenNotifications = () => {
            dismissTransientOverlays('notifications');
            openInFlightRef.current = false;
            if (showNotificationsRef.current) {
                closeNotifications();
            }
            commitNotificationShellOpen({
                userId,
                showNotificationsRef,
                setNotificationHostMounted,
                setShowNotifications,
            });
        };
        w.__hamiE2eNotificationDebug = () => ({
            showNotifications: showNotificationsRef.current,
            notificationPanelMounted:
                showNotificationsRef.current || notificationHostMountedRef.current,
        });
        return () => {
            delete w.__hamiE2eForceCloseNotifications;
            delete w.__hamiE2eForceOpenNotifications;
            delete w.__hamiE2eNotificationDebug;
        };
    }, [
        closeNotifications,
        notificationHostMountedRef,
        openInFlightRef,
        setNotificationHostMounted,
        setShowNotifications,
        showNotificationsRef,
        userId,
    ]);
}
