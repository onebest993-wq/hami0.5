import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/boot/peekBootSessionUserId', () => ({
    peekBootSessionUserIdSync: () => 'lawyer-1',
    peekBootSessionPeekSync: () => ({ userId: 'lawyer-1', userMetadata: null }),
}));

vi.mock('@/app/services/profile/profileWarmCache', () => ({
    hydrateProfileWarmCachePeekSync: () => null,
}));

vi.mock('@/app/infrastructure/notificationPeekLite', () => ({
    peekNotificationUnreadCount: (id: string | null) => (id ? 3 : 0),
    peekLocalNotifications: (id: string | null) =>
        id ? [{ isRead: false }, { isRead: false }, { isRead: false }] : [],
    hasStoredLocalNotifications: () => false,
}));

vi.mock('@/app/services/alerts/homeHubSecretaryAlertsWarmCache', () => ({
    peekHomeHubSecretaryAlertsCache: (id: string | null) =>
        id ? [{ id: 'a1', title: 'تنبيه' }] : null,
}));

describe('bootFrame1Hydrate', () => {
    afterEach(async () => {
        const { resetFrame1HydrateForTests } = await import('@/app/bootstrap/bootFrame1Hydrate');
        const { resetDashboardFrame1SnapshotForTests } = await import(
            '@/app/bootstrap/dashboardFrame1Snapshot'
        );
        resetFrame1HydrateForTests();
        resetDashboardFrame1SnapshotForTests('lawyer-1');
        vi.resetModules();
    });

    it('يزرع شارات غير صفرية من الكاش المحلي', async () => {
        const { ensureFrame1HydrateSync, peekFrame1Hydrate } = await import(
            '@/app/bootstrap/bootFrame1Hydrate'
        );
        const snap = ensureFrame1HydrateSync();
        expect(snap.userId).toBe('lawyer-1');
        expect(snap.unreadCount).toBe(3);
        expect(snap.secretaryAlerts).toHaveLength(1);
        expect(snap.secretaryAlertCount).toBe(1);
        expect(peekFrame1Hydrate()?.unreadCount).toBe(3);
    });

    it('يقرأ شارة المنتدى والمهام من لقطة القرص', async () => {
        const { patchDashboardFrame1Snapshot } = await import(
            '@/app/bootstrap/dashboardFrame1Snapshot'
        );
        patchDashboardFrame1Snapshot('lawyer-1', {
            forumUnreadCount: 6,
            pendingFieldTasksCount: 2,
            pinnedCount: 4,
            urgentAlertsCount: 1,
        });
        const { ensureFrame1HydrateSync } = await import('@/app/bootstrap/bootFrame1Hydrate');
        const snap = ensureFrame1HydrateSync();
        expect(snap.forumUnreadCount).toBe(6);
        expect(snap.pendingFieldTasksCount).toBe(2);
        expect(snap.pinnedCount).toBe(4);
        expect(snap.urgentAlertsCount).toBe(1);
    });
});
