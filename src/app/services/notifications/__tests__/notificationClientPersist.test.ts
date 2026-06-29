import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSecureMock = vi.fn();

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: (...args: unknown[]) => fetchSecureMock(...args),
    },
}));

vi.mock('@/app/services/notifications/notificationServerSync', () => ({
    isNotificationServerSyncEnabled: vi.fn(() => true),
}));

import { syncMarkReadClient } from '@/app/services/notifications/notificationClientPersist';

describe('notificationClientPersist', () => {
    beforeEach(() => {
        fetchSecureMock.mockReset();
    });

    it('syncMarkReadClient يستدعي read-state', async () => {
        fetchSecureMock.mockResolvedValue({
            ok: true,
            notifications: [{ id: 'n1', title: 't', message: 'm', type: 'system_alert', isRead: true, createdAt: '2026-01-01T00:00:00.000Z' }],
        });

        const result = await syncMarkReadClient('n1');
        expect(result).toHaveLength(1);
        expect(fetchSecureMock).toHaveBeenCalledWith(
            '/api/notifications/read-state',
            expect.objectContaining({ method: 'POST' }),
        );
    });
});
