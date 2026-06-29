import { useEffect, useState } from 'react';
import { ForumNotificationStreamService } from '@/app/services/forum/ForumNotificationStreamService';
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

        const release = ForumNotificationStreamService.acquire(userId);
        setConnected(ForumNotificationStreamService.isRunning());

        const unsub = ForumNotificationStreamService.subscribe(() => {
            setConnected(ForumNotificationStreamService.isRunning());
        });

        return () => {
            unsub();
            release();
            setConnected(false);
        };
    }, [enabled, userId]);

    useVisibilityAwareInterval(() => {
        if (!enabled || !userId) return;
        if (!ForumNotificationStreamService.isRunning()) {
            void ForumNotificationStreamService.start(userId);
        }
    }, resolveForumStreamHealthCheckMs(), enabled && Boolean(userId));

    return connected;
}
