import { useEffect, useState } from 'react';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import { resolveForumStreamHealthCheckMs } from '@/app/components/lawyer/CommunityScreen/communityFeedPolicy';

/** بث SSE لتنبيهات المنتدى — يُعوّض الاستطلاع المتكرر عند الاتصال */
export function useForumNotificationStream(userId: string | null, enabled = true): boolean {
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!enabled || !userId) {
            setConnected(false);
            return;
        }

        let cancelled = false;
        let release: (() => void) | undefined;
        let unsub: (() => void) | undefined;

        void import('@/app/services/forum/ForumNotificationStreamService').then((m) => {
            if (cancelled) return;
            const { ForumNotificationStreamService } = m;
            release = ForumNotificationStreamService.acquire(userId);
            setConnected(ForumNotificationStreamService.isRunning());
            unsub = ForumNotificationStreamService.subscribe(() => {
                if (!cancelled) {
                    setConnected(ForumNotificationStreamService.isRunning());
                }
            });
        });

        return () => {
            cancelled = true;
            unsub?.();
            release?.();
            setConnected(false);
        };
    }, [enabled, userId]);

    useVisibilityAwareInterval(() => {
        if (!enabled || !userId) return;
        void import('@/app/services/forum/ForumNotificationStreamService').then((m) => {
            if (!m.ForumNotificationStreamService.isRunning()) {
                void m.ForumNotificationStreamService.start(userId);
            }
        });
    }, resolveForumStreamHealthCheckMs(), enabled && Boolean(userId));

    return connected;
}
