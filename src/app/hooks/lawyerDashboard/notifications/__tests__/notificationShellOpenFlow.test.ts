import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    hydrateMock: vi.fn(() => Promise.resolve(true)),
    markPerfMock: vi.fn(),
    warmOnOpenMock: vi.fn(),
    persistMock: vi.fn(),
    dismissMock: vi.fn(),
}));

vi.mock('react-dom', () => ({
    flushSync: (fn: () => void) => fn(),
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: mocks.dismissMock,
}));

vi.mock('@/app/hooks/lawyerDashboard/lawyerDashboardNav', () => ({
    persistNotificationsSessionOpen: mocks.persistMock,
}));

vi.mock('@/app/runtime/notificationInstantPaint', () => ({
    revealNotificationWarmPanel: vi.fn(() => false),
}));

vi.mock('@/app/hooks/lawyerDashboard/notifications/notificationDashboardLazyImports', () => ({
    loadNotificationBootHydrator: () =>
        Promise.resolve({ hydrateNotificationShellForInstantOpen: mocks.hydrateMock }),
    loadNotificationIntentWarm: () => Promise.resolve({ warmNotificationsOnOpen: mocks.warmOnOpenMock }),
    loadNotificationPerfMetrics: () => Promise.resolve({ markNotificationPerfPhase: mocks.markPerfMock }),
}));

describe('notificationShellOpenFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('clearNotificationOpenPerfMarks لا يرمي عند غياب performance', async () => {
        const { clearNotificationOpenPerfMarks } = await import(
            '@/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow'
        );
        expect(() => clearNotificationOpenPerfMarks()).not.toThrow();
    });

    it('commitNotificationShellOpen يفتح ويُسجّل الجلسة', async () => {
        const { commitNotificationShellOpen } = await import(
            '@/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow'
        );
        const showNotificationsRef = { current: false };
        const setNotificationHostMounted = vi.fn();
        const setShowNotifications = vi.fn();

        commitNotificationShellOpen({
            userId: 'lawyer-1',
            showNotificationsRef,
            setNotificationHostMounted,
            setShowNotifications,
        });

        expect(showNotificationsRef.current).toBe(true);
        expect(setNotificationHostMounted).toHaveBeenCalledWith(true);
        expect(setShowNotifications).toHaveBeenCalledWith(true);
        expect(mocks.persistMock).toHaveBeenCalledWith(true);

        await new Promise<void>((resolve) => queueMicrotask(resolve));
        expect(mocks.dismissMock).toHaveBeenCalledWith('notifications');

        await vi.waitFor(() => {
            expect(mocks.warmOnOpenMock).toHaveBeenCalledWith('lawyer-1');
            expect(mocks.hydrateMock).toHaveBeenCalledWith(true);
            expect(mocks.markPerfMock).toHaveBeenCalledWith('chunk-ready');
        });
    });
});
