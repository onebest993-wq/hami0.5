import { useCallback, useEffect } from 'react';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import { TIMING } from '@/app/utils/constants';
import { FORUM_UNREAD_CHANGED_EVENT } from '@/app/services/forum/forumNotificationBridge';
import { refreshNotificationShellBadge } from '@/app/services/notifications/notificationBackgroundSync';
import { dispatchCaseShareChanged } from '@/app/services/caseShare/caseShareSession';
import { probeNotificationProductionReadinessOnce } from '@/app/services/notifications/notificationProductionReadiness';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';

export function useNotificationBackgroundSync(
    userId: string | null,
    options?: { panelOpen?: boolean; enabled?: boolean },
) {
    const panelOpen = options?.panelOpen === true;
    const enabled = options?.enabled !== false && isRealSignedIn(userId);

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
        enabled && !panelOpen,
    );

    useEffect(() => {
        if (!enabled || !userId) return;
        void probeNotificationProductionReadinessOnce();
    }, [enabled, userId]);

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
