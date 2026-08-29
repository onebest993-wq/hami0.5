import { describe, expect, it } from 'vitest';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import {
    NOTIFICATION_LIST_RENDER_BATCH,
    flattenNotificationBuckets,
    resolveNotificationListLimit,
    sliceGroupedNotifications,
} from '@/app/components/lawyer/NotificationPanel/utils/notificationListWindow';

function item(id: string): NotificationModel {
    return {
        id,
        title: id,
        message: 'm',
        type: 'forum_reply',
        isRead: false,
        createdAt: '2026-08-25T08:00:00.000Z',
    };
}

describe('notificationListWindow', () => {
    it('يقطع بعد الدفعة ويبقي العدد الكامل للحساب', () => {
        const grouped = {
            today: Array.from({ length: 40 }, (_, i) => item(`t-${i}`)),
            yesterday: [item('y-1')],
            older: [],
        };
        const flat = flattenNotificationBuckets(grouped);
        expect(flat).toHaveLength(41);
        const limit = resolveNotificationListLimit({
            total: flat.length,
            requested: NOTIFICATION_LIST_RENDER_BATCH,
            flat,
        });
        expect(limit).toBe(NOTIFICATION_LIST_RENDER_BATCH);
        const sliced = sliceGroupedNotifications(grouped, limit);
        expect(sliced.visible.today).toHaveLength(NOTIFICATION_LIST_RENDER_BATCH);
        expect(sliced.visible.yesterday).toHaveLength(0);
        expect(sliced.hiddenCount).toBe(41 - NOTIFICATION_LIST_RENDER_BATCH);
    });

    it('يمد النافذة حتى بطاقة التركيز', () => {
        const grouped = {
            today: Array.from({ length: 40 }, (_, i) => item(`t-${i}`)),
            yesterday: [],
            older: [],
        };
        const flat = flattenNotificationBuckets(grouped);
        const limit = resolveNotificationListLimit({
            total: flat.length,
            requested: NOTIFICATION_LIST_RENDER_BATCH,
            flat,
            ensureId: 't-35',
        });
        expect(limit).toBe(36);
        expect(sliceGroupedNotifications(grouped, limit).visible.today.some((n) => n.id === 't-35')).toBe(
            true,
        );
    });
});
