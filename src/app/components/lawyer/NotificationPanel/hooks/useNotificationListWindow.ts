import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import type { TimeBucket } from '@/app/components/lawyer/NotificationPanel/types';
import {
    NOTIFICATION_LIST_RENDER_BATCH,
    flattenNotificationBuckets,
    resolveNotificationListLimit,
    sliceGroupedNotifications,
} from '@/app/components/lawyer/NotificationPanel/utils/notificationListWindow';

export function useNotificationListWindow(
    groupedByTime: Record<TimeBucket, NotificationModel[]>,
    ensureId?: string | null,
) {
    const [requested, setRequested] = useState(NOTIFICATION_LIST_RENDER_BATCH);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const flat = useMemo(() => flattenNotificationBuckets(groupedByTime), [groupedByTime]);
    const total = flat.length;
    const signature = `${flat[0]?.id ?? ''}:${total}`;

    useEffect(() => {
        setRequested(NOTIFICATION_LIST_RENDER_BATCH);
    }, [signature]);

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') {
            setRequested(Number.POSITIVE_INFINITY);
        }
    }, []);

    const limit = resolveNotificationListLimit({
        total,
        requested,
        flat,
        ensureId,
    });
    const { visible, hiddenCount } = sliceGroupedNotifications(groupedByTime, limit);

    const expand = useCallback(() => {
        setRequested((current) =>
            Number.isFinite(current) ? current + NOTIFICATION_LIST_RENDER_BATCH : current,
        );
    }, []);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || hiddenCount <= 0 || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) expand();
            },
            { root: node.closest('.hami-notif-scroll'), rootMargin: '160px' },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [expand, hiddenCount, limit]);

    return { visible, hiddenCount, sentinelRef };
}
