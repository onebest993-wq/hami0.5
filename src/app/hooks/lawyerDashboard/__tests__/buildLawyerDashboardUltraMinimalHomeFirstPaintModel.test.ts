import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/boot/peekBootSessionUserId', () => ({
    peekBootSessionUserIdSync: () => 'lawyer-1',
    peekBootSessionPeekSync: () => ({ userId: 'lawyer-1', userMetadata: null }),
}));

vi.mock('@/app/infrastructure/notificationPeekLite', () => ({
    peekNotificationUnreadCount: () => 7,
    peekLocalNotifications: () =>
        Array.from({ length: 7 }, () => ({ isRead: false })),
    hasStoredLocalNotifications: () => false,
}));

vi.mock('@/app/services/alerts/homeHubSecretaryAlertsWarmCache', () => ({
    peekHomeHubSecretaryAlertsCache: () => [{ id: 's1', title: 'سكرتير' }],
}));

vi.mock('@/app/hooks/lawyerDashboard/lawyerDashboardSurfaceUtils', () => ({
    buildLawyerDashboardSurface: () => ({
        wallpaperSrc: null,
        hasWallpaper: false,
        dashboardSurfaceStyle: {},
    }),
}));

vi.mock('@/app/services/calendar/bridge/lite', () => ({
    resolveCalendarUserId: (id: string | null) => id ?? 'lawyer-1',
}));

vi.mock('@/app/workspace/clusterScanSourcesLite', () => ({
    createEmptyClusterScanSources: () => ({}),
}));

vi.mock('@/app/components/lawyer/dashboard/createNavigationStubs', () => ({
    createNavigationStubs: () => ({
        navigateWorkspaceRoute: () => undefined,
        openSecretaryAlert: () => undefined,
    }),
}));

vi.mock('@/app/hooks/lawyerDashboard/lawyerDashboardHeaderIntentBridge', () => ({
    requestLawyerDashboardHeaderIntent: () => undefined,
}));

describe('buildLawyerDashboardUltraMinimalHomeFirstPaintModel', () => {
    afterEach(async () => {
        const { resetFrame1HydrateForTests } = await import('@/app/bootstrap/bootFrame1Hydrate');
        resetFrame1HydrateForTests();
        vi.resetModules();
    });

    it('يزرع unread والسكرتير من Frame-1 لا أصفار وهمية', async () => {
        const { buildLawyerDashboardUltraMinimalHomeFirstPaintModel } = await import(
            '@/app/hooks/lawyerDashboard/buildLawyerDashboardUltraMinimalHomeFirstPaintModel'
        );
        const user = { id: 'lawyer-1' } as import('@supabase/supabase-js').User;
        const model = buildLawyerDashboardUltraMinimalHomeFirstPaintModel({
            user,
            theme: { bg: '#0a0f1c' } as never,
            shapeClass: '' as never,
            appearance: {} as never,
            pendingFieldTasksCount: 0,
            backgroundRuntimeEnabled: false,
            onLogout: () => undefined,
        });
        expect(model.headerProps.unreadCount).toBe(7);
        expect(model.homeTabProps.secretaryAlerts).toHaveLength(1);
    });
});
