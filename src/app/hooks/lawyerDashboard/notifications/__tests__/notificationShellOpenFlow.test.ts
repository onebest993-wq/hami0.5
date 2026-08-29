import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    hydrateMock: vi.fn(() => Promise.resolve(true)),
    markPerfMock: vi.fn(),
    warmOnOpenMock: vi.fn(),
    persistMock: vi.fn(),
    dismissMock: vi.fn(),
    paintMock: vi.fn(() => true),
    prefetchAlertMock: vi.fn(),
    peekHydrateMock: vi.fn(),
    tryPresentNative: vi.fn(() => Promise.resolve(false)),
    reopenSuppressed: false,
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: mocks.dismissMock,
}));

vi.mock('@/app/hooks/lawyerDashboard/lawyerDashboardNav', () => ({
    persistNotificationsSessionOpen: mocks.persistMock,
}));

vi.mock('@/app/runtime/notificationInstantPaint', () => ({
    paintNotificationInstantChrome: mocks.paintMock,
    armNotificationOverlayInteraction: vi.fn(),
}));

vi.mock('@/app/components/lawyer/NotificationPanel/notificationPanelLazyModules', () => ({
    prefetchNotificationAlertControls: mocks.prefetchAlertMock,
}));

vi.mock('@/app/stores/notificationStore', () => ({
    useNotificationStore: {
        getState: () => ({ hydrateFromLocalPeek: mocks.peekHydrateMock }),
    },
}));

vi.mock('@/app/hooks/lawyerDashboard/notifications/notificationDashboardLazyImports', () => ({
    loadNotificationBootHydrator: () =>
        Promise.resolve({ hydrateNotificationShellForInstantOpen: mocks.hydrateMock }),
    loadNotificationIntentWarm: () => Promise.resolve({ warmNotificationsOnOpen: mocks.warmOnOpenMock }),
    loadNotificationPerfMetrics: () => Promise.resolve({ markNotificationPerfPhase: mocks.markPerfMock }),
}));

vi.mock('@/app/runtime/nativeNotificationSheetBridge', () => ({
    tryPresentNativeNotificationSheet: (...args: unknown[]) => mocks.tryPresentNative(...args),
}));

vi.mock('@/app/services/notifications/notificationReopenGuard', () => ({
    isNotificationReopenSuppressed: () => mocks.reopenSuppressed,
}));

describe('notificationShellOpenFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.reopenSuppressed = false;
        mocks.tryPresentNative.mockResolvedValue(false);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('clearNotificationOpenPerfMarks لا يرمي عند غياب performance', async () => {
        const { clearNotificationOpenPerfMarks } = await import(
            '@/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow'
        );
        expect(() => clearNotificationOpenPerfMarks()).not.toThrow();
    });

    it('commitNotificationShellOpen يطلي ثم يلتزم React بلا flushSync', async () => {
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
        expect(mocks.paintMock).toHaveBeenCalled();
        expect(setNotificationHostMounted).toHaveBeenCalledWith(true);
        expect(setShowNotifications).toHaveBeenCalledWith(true);
        expect(mocks.dismissMock).toHaveBeenCalledWith('notifications');

        await new Promise<void>((resolve) => queueMicrotask(resolve));
        expect(mocks.persistMock).toHaveBeenCalledWith(true);

        await vi.waitFor(() => {
            expect(mocks.warmOnOpenMock).toHaveBeenCalledWith('lawyer-1');
            expect(mocks.hydrateMock).toHaveBeenCalledWith(true);
            expect(mocks.markPerfMock).toHaveBeenCalledWith('chunk-ready');
        });
    });

    it('beginNotificationShellOpen يلتزم الويب ويحرّر in-flight', async () => {
        const { beginNotificationShellOpen } = await import(
            '@/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow'
        );
        const openInFlightRef = { current: false };
        const showNotificationsRef = { current: false };
        const setNotificationHostMounted = vi.fn();
        const setShowNotifications = vi.fn();

        beginNotificationShellOpen({
            userId: 'lawyer-1',
            showNotificationsRef,
            setNotificationHostMounted,
            setShowNotifications,
            openInFlightRef,
        });

        expect(mocks.paintMock).toHaveBeenCalledTimes(1);
        expect(openInFlightRef.current).toBe(false);
        expect(setShowNotifications).toHaveBeenCalledWith(true);
    });

    it('beginNotificationShellOpen لا يفتح الويب عند نجاح الورقة الأصلية', async () => {
        vi.stubEnv('VITE_NATIVE_NOTIFICATION_SHEET', 'true');
        mocks.tryPresentNative.mockResolvedValue(true);
        const { beginNotificationShellOpen } = await import(
            '@/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow'
        );
        const openInFlightRef = { current: false };

        beginNotificationShellOpen({
            userId: 'lawyer-1',
            showNotificationsRef: { current: false },
            setNotificationHostMounted: vi.fn(),
            setShowNotifications: vi.fn(),
            openInFlightRef,
        });

        await vi.waitFor(() => {
            expect(mocks.tryPresentNative).toHaveBeenCalledWith('lawyer-1');
        });
        expect(mocks.paintMock).not.toHaveBeenCalled();
        expect(openInFlightRef.current).toBe(false);
    });

    it('beginNotificationShellOpen يتجاهل الفتح أثناء قمع إعادة الفتح', async () => {
        mocks.reopenSuppressed = true;
        const { beginNotificationShellOpen } = await import(
            '@/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow'
        );
        const openInFlightRef = { current: false };

        beginNotificationShellOpen({
            userId: 'lawyer-1',
            showNotificationsRef: { current: false },
            setNotificationHostMounted: vi.fn(),
            setShowNotifications: vi.fn(),
            openInFlightRef,
        });

        expect(mocks.paintMock).not.toHaveBeenCalled();
        expect(openInFlightRef.current).toBe(false);
    });
});
