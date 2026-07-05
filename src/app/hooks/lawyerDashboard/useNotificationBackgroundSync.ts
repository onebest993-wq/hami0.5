import { useCallback, useEffect, useState } from 'react';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import { TIMING } from '@/app/utils/constants';
import { FORUM_UNREAD_CHANGED_EVENT } from '@/app/services/forum/forumNotificationBridge';
import { refreshNotificationShellBadge } from '@/app/services/notifications/notificationBackgroundSync';
import { dispatchCaseShareChanged } from '@/app/services/caseShare/caseShareSession';
import { probeNotificationProductionReadinessOnce } from '@/app/services/notifications/notificationProductionReadiness';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { STAGGERED_BOOT_IDLE_EVENT } from '@/app/bootstrap/staggeredBootOrchestrator';

export function useNotificationBackgroundSync(
    userId: string | null,
    options?: { panelOpen?: boolean; enabled?: boolean; deferUntilBootIdle?: boolean },
) {
    const panelOpen = options?.panelOpen === true;
    const deferUntilBootIdle = options?.deferUntilBootIdle === true;
    const enabled = options?.enabled !== false && isRealSignedIn(userId);
    const [bootSyncArmed, setBootSyncArmed] = useState(!deferUntilBootIdle);
    const syncEnabled = enabled && bootSyncArmed;

    const refreshBadge = useCallback(() => {
        if (!userId) return;
        void refreshNotificationShellBadge(userId, {
            includeStoreFetch: !panelOpen,
            includeForumSync: true,
        }).finally(() => {
            dispatchCaseShareChanged();
        });
    }, [panelOpen, userId]);

    useVisibilityAwareInterval(
        refreshBadge,
        TIMING.NOTIFICATION_BADGE_POLL,
        syncEnabled && !panelOpen,
    );

    useEffect(() => {
        if (!enabled || !userId || !deferUntilBootIdle) return;

        let armed = false;
        let fallbackTimer: number | undefined;

        const armSync = () => {
            if (armed) return;
            armed = true;
            setBootSyncArmed(true);
            void refreshNotificationShellBadge(userId, {
                includeStoreFetch: !panelOpen,
                includeForumSync: true,
            }).finally(() => {
                dispatchCaseShareChanged();
            });
            void probeNotificationProductionReadinessOnce();
        };

        window.addEventListener(STAGGERED_BOOT_IDLE_EVENT, armSync, { once: true });
        fallbackTimer = window.setTimeout(armSync, 20_000);

        return () => {
            window.removeEventListener(STAGGERED_BOOT_IDLE_EVENT, armSync);
            if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
        };
    }, [deferUntilBootIdle, enabled, panelOpen, userId]);

    useEffect(() => {
        if (!enabled || !userId || deferUntilBootIdle) return;
        void probeNotificationProductionReadinessOnce();
    }, [deferUntilBootIdle, enabled, userId]);

    useEffect(() => {
        if (!enabled || !userId) return;

        const onForumUnread = (e: Event) => {
            const detail = (e as CustomEvent<{ refresh?: boolean }>).detail;
            if (detail?.refresh !== true) return;
            void refreshNotificationShellBadge(userId, {
                includeStoreFetch: !panelOpen,
                includeForumSync: true,
            }).finally(() => {
                dispatchCaseShareChanged();
            });
        };

        window.addEventListener(FORUM_UNREAD_CHANGED_EVENT, onForumUnread);
        return () => window.removeEventListener(FORUM_UNREAD_CHANGED_EVENT, onForumUnread);
    }, [enabled, panelOpen, userId]);
}
