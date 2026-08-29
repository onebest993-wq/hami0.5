import { describe, expect, it, afterEach } from 'vitest';
import { shouldKeepNotificationHostWarm } from '@/app/services/notifications/notificationHostKeepAlive';

describe('shouldKeepNotificationHostWarm', () => {
    afterEach(() => {
        delete document.documentElement.dataset.hamiLite;
        delete document.documentElement.dataset.hamiNative;
    });

    it('يبقي الشجرة دافئة على سطح المكتب بلا أختام', () => {
        expect(shouldKeepNotificationHostWarm()).toBe(true);
    });

    it('يفك keepAlive على الوضع الخفيف والأصل', () => {
        document.documentElement.dataset.hamiLite = '1';
        expect(shouldKeepNotificationHostWarm()).toBe(false);
        delete document.documentElement.dataset.hamiLite;
        document.documentElement.dataset.hamiNative = '1';
        expect(shouldKeepNotificationHostWarm()).toBe(false);
    });
});
