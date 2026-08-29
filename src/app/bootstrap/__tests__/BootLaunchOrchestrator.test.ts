import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/boot/peekBootSessionUserId', () => ({
    peekBootSessionUserIdSync: () => 'u1',
    peekBootSessionPeekSync: () => ({ userId: 'u1', userMetadata: null }),
}));

vi.mock('@/app/infrastructure/notificationPeekLite', () => ({
    peekNotificationUnreadCount: () => 2,
    peekLocalNotifications: () => [{ isRead: false }, { isRead: false }],
    hasStoredLocalNotifications: () => false,
}));

vi.mock('@/app/services/alerts/homeHubSecretaryAlertsWarmCache', () => ({
    peekHomeHubSecretaryAlertsCache: () => [],
}));

describe('BootLaunchOrchestrator', () => {
    afterEach(async () => {
        const { resetFrame1HydrateForTests } = await import('@/app/bootstrap/bootFrame1Hydrate');
        resetFrame1HydrateForTests();
        vi.resetModules();
    });

    it('يحافظ على ترتيب المراحل ويعيد بذرة Frame-1', async () => {
        const orch = await import('@/app/bootstrap/BootLaunchOrchestrator');
        expect(orch.BOOT_LAUNCH_PHASE_ORDER[0]).toBe('frame1-seed');
        expect(orch.BOOT_LAUNCH_PHASE_ORDER.at(-1)).toBe('reveal-done');
        const snap = orch.seedBootLaunchFrame1();
        expect(snap.unreadCount).toBe(2);
        expect(orch.beforeBootShellReveal().userId).toBe('u1');
    });
});
