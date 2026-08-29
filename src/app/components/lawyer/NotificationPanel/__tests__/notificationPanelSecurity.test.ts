import { describe, expect, it } from 'vitest';
import {
    isNotificationNavTarget,
    sanitizeNotificationActionPayload,
} from '@/app/services/notifications/notificationNavigateSecurity';
import {
    isNotificationHeaderBusy,
    isNotificationPanelColdLoading,
} from '@/app/components/lawyer/NotificationPanel/utils/notificationHeaderBusy';

describe('notificationNavigateSecurity', () => {
    it('يسمح بمسارات معروفة فقط', () => {
        expect(isNotificationNavTarget('community')).toBe(true);
        expect(isNotificationNavTarget('evil')).toBe(false);
    });

    it('ينقّي حمولة التنقّل', () => {
        const out = sanitizeNotificationActionPayload({
            postId: 'p-1',
            evil: '<script>',
            fileId: 'x'.repeat(200),
        });
        expect(out).toEqual({ postId: 'p-1' });
        expect(out.evil).toBeUndefined();
    });
});

describe('notificationHeaderBusy', () => {
    it('لا يُظهر انشغال الرأس عند وجود بيانات مخزّنة', () => {
        expect(isNotificationHeaderBusy(true, true)).toBe(false);
        expect(isNotificationHeaderBusy(true, false)).toBe(true);
    });

    it('يُظهر تحميل القائمة فقط عند البرد الفعلي', () => {
        expect(isNotificationPanelColdLoading(true, 0, false)).toBe(true);
        expect(isNotificationPanelColdLoading(true, 0, false, true)).toBe(false);
        expect(isNotificationPanelColdLoading(true, 2, false)).toBe(false);
        expect(isNotificationPanelColdLoading(true, 0, true)).toBe(false);
    });
});
