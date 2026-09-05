import { describe, expect, it } from 'vitest';
import { isNotificationPanelListLive } from '@/app/components/lawyer/NotificationPanel/utils/notificationPanelListLive';

describe('isNotificationPanelListLive', () => {
    it('يُسلّح القائمة عند الفتح أو حضور الستارة فقط', () => {
        expect(isNotificationPanelListLive(false, false)).toBe(false);
        expect(isNotificationPanelListLive(true, false)).toBe(true);
        expect(isNotificationPanelListLive(false, true)).toBe(true);
        expect(isNotificationPanelListLive(true, true)).toBe(true);
    });
});
