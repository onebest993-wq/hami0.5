import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/app/services/notifications/notificationServerSync', () => ({
    isNotificationServerSyncEnabled: vi.fn(() => false),
}));

import { isNotificationServerSyncEnabled } from '@/app/services/notifications/notificationServerSync';

describe('notificationServerSync', () => {
    beforeEach(() => {
        vi.mocked(isNotificationServerSyncEnabled).mockReturnValue(false);
    });

    it('DEV بدون flag → sync معطّل', () => {
        expect(isNotificationServerSyncEnabled()).toBe(false);
    });
});
