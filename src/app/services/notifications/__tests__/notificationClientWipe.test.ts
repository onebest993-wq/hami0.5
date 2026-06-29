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

import { wipeShellNotificationsClient } from '@/app/services/notifications/notificationClientWipe';

describe('notificationClientWipe', () => {
    beforeEach(() => {
        fetchSecureMock.mockReset();
    });

    it('يستدعي POST /api/notifications/wipe', async () => {
        fetchSecureMock.mockResolvedValue({ ok: true });
        const ok = await wipeShellNotificationsClient();
        expect(ok).toBe(true);
        expect(fetchSecureMock).toHaveBeenCalledWith(
            '/api/notifications/wipe',
            expect.objectContaining({ method: 'POST' }),
        );
    });
});
