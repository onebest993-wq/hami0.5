import { describe, expect, it } from 'vitest';
import { resolveNotificationServerSyncEnabled } from '@/app/services/notifications/notificationServerSync';

describe('resolveNotificationServerSyncEnabled', () => {
    it('الخادم دائماً يسحب/يكتب الصندوق', () => {
        expect(resolveNotificationServerSyncEnabled({ isBrowser: false })).toBe(true);
        expect(resolveNotificationServerSyncEnabled({ isBrowser: false, flag: 'false' })).toBe(true);
    });

    it('المتصفح مفعّل افتراضياً حتى بدون flag', () => {
        expect(resolveNotificationServerSyncEnabled({ isBrowser: true })).toBe(true);
        expect(resolveNotificationServerSyncEnabled({ isBrowser: true, flag: 'true' })).toBe(true);
    });

    it('VITE_HAMI_NOTIFICATION_SERVER_SYNC=false يعطّل المزامنة في المتصفح', () => {
        expect(resolveNotificationServerSyncEnabled({ isBrowser: true, flag: 'false' })).toBe(false);
        expect(resolveNotificationServerSyncEnabled({ isBrowser: true, flag: '0' })).toBe(false);
    });
});
