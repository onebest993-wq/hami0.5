import { describe, expect, it } from 'vitest';
import {
    notificationPanelEmptyMessage,
    resolveNotificationPanelBodyView,
} from '@/app/components/lawyer/NotificationPanel/utils/resolveNotificationPanelBodyView';

describe('resolveNotificationPanelBodyView', () => {
    it('يعيد loading عند التحميل البارد', () => {
        expect(
            resolveNotificationPanelBodyView({ displayListLoading: true, visibleCount: 0 }),
        ).toBe('loading');
    });

    it('يعيد empty عند عدم وجود عناصر بعد التحميل', () => {
        expect(
            resolveNotificationPanelBodyView({ displayListLoading: false, visibleCount: 0 }),
        ).toBe('empty');
    });

    it('يعيد list عند وجود عناصر', () => {
        expect(
            resolveNotificationPanelBodyView({ displayListLoading: false, visibleCount: 3 }),
        ).toBe('list');
    });

    it('loading يتقدّم على empty عند التحميل المتزامن', () => {
        expect(
            resolveNotificationPanelBodyView({ displayListLoading: true, visibleCount: 5 }),
        ).toBe('loading');
    });
});

describe('notificationPanelEmptyMessage', () => {
    it('رسالة فارغة حسب التبويب النشط فقط', () => {
        expect(notificationPanelEmptyMessage('forum')).toBe('لا إشعارات منتدى حالياً');
        expect(notificationPanelEmptyMessage('system')).toBe('لا إشعارات نظام حالياً');
    });
});
