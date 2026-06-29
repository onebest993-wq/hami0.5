import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSecureMock = vi.fn();

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: (...args: unknown[]) => fetchSecureMock(...args),
    },
}));

vi.mock('@/app/services/notifications/notificationServerSync', () => ({
    isNotificationServerSyncEnabled: vi.fn(() => false),
}));

import { appendNotificationClient } from '@/app/services/notifications/notificationClientAppend';

describe('notificationClientAppend', () => {
    beforeEach(() => {
        fetchSecureMock.mockReset();
    });

    it('بدون server sync يُرجع null دون شبكة', async () => {
        const result = await appendNotificationClient({
            title: 't',
            message: 'm',
            type: 'system_alert',
            category: 'system',
        });
        expect(result).toBeNull();
        expect(fetchSecureMock).not.toHaveBeenCalled();
    });
});
