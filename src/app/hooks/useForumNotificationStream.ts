import { useEffect, useState } from 'react';
import { ForumNotificationStreamService } from '@/app/services/forum/ForumNotificationStreamService';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';

/** بث SSE لتنبيهات المنتدى — يُعوّض الاستطلاع المتكرر عند الاتصال */
export function useForumNotificationStream(userId: string | null, enabled = true): boolean {
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!enabled || !userId) {
            ForumNotificationStreamService.stop();
            setConnected(false);
            return;
        }

        setConnected(true);
        void ForumNotificationStreamService.start(userId);

        const unsub = ForumNotificationStreamService.subscribe(() => {
            setConnected(ForumNotificationStreamService.isRunning());
        });

        return () => {
            unsub();
            ForumNotificationStreamService.stop();
            setConnected(false);
        };
    }, [enabled, userId]);

    useVisibilityAwareInterval(() => {
        if (!enabled || !userId) return;
        if (!ForumNotificationStreamService.isRunning()) {
            void ForumNotificationStreamService.start(userId);
        }
    }, 30_000, enabled && Boolean(userId));

    return connected;
}
