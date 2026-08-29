import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import type { TimeBucket } from '@/app/components/lawyer/NotificationPanel/types';

export const NOTIFICATION_LIST_RENDER_BATCH = 28;
/** يطابق contain-intrinsic-size للبطاقة */
export const NOTIFICATION_LIST_CARD_SLOT_PX = 92;

const BUCKET_ORDER: TimeBucket[] = ['today', 'yesterday', 'older'];

export function flattenNotificationBuckets(
    grouped: Record<TimeBucket, NotificationModel[]>,
): NotificationModel[] {
    return BUCKET_ORDER.flatMap((bucket) => grouped[bucket]);
}

export function resolveNotificationListLimit(input: {
    total: number;
    requested: number;
    flat: readonly NotificationModel[];
    ensureId?: string | null;
}): number {
    const batchFloor = Math.max(NOTIFICATION_LIST_RENDER_BATCH, input.requested);
    let limit = Math.min(input.total, batchFloor);
    if (input.ensureId) {
        const index = input.flat.findIndex((item) => item.id === input.ensureId);
        if (index >= 0) limit = Math.max(limit, index + 1);
    }
    return limit;
}

export function sliceGroupedNotifications(
    grouped: Record<TimeBucket, NotificationModel[]>,
    limit: number,
): { visible: Record<TimeBucket, NotificationModel[]>; hiddenCount: number } {
    let remaining = Math.max(0, limit);
    const visible: Record<TimeBucket, NotificationModel[]> = {
        today: [],
        yesterday: [],
        older: [],
    };
    let shown = 0;
    for (const bucket of BUCKET_ORDER) {
        const items = grouped[bucket];
        if (remaining <= 0) continue;
        const take = items.slice(0, remaining);
        visible[bucket] = take;
        remaining -= take.length;
        shown += take.length;
    }
    const total = grouped.today.length + grouped.yesterday.length + grouped.older.length;
    return { visible, hiddenCount: Math.max(0, total - shown) };
}
