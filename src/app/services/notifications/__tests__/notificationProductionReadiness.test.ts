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

import {
    probeNotificationProductionReadinessOnce,
    resetNotificationReadinessProbeForTests,
} from '@/app/services/notifications/notificationProductionReadiness';

describe('notificationProductionReadiness', () => {
    beforeEach(() => {
        fetchSecureMock.mockReset();
        resetNotificationReadinessProbeForTests();
    });

    it('يستدعي health مرة واحدة ويُرجع true عند ready', async () => {
        fetchSecureMock.mockResolvedValue({ ok: true, ready: true });
        const a = await probeNotificationProductionReadinessOnce();
        const b = await probeNotificationProductionReadinessOnce();
        expect(a).toBe(true);
        expect(b).toBeNull();
        expect(fetchSecureMock).toHaveBeenCalledTimes(1);
    });
});
