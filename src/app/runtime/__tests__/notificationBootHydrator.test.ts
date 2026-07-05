import { beforeEach, describe, expect, it, vi } from 'vitest';

const hydrateNotificationPanelForInstantOpen = vi.fn(() => Promise.resolve(true));
const isNotificationPanelModuleResolved = vi.fn(() => false);
const prefetchNotificationPanel = vi.fn();

vi.mock('@/app/runtime/notificationPanelLoader', () => ({
    hydrateNotificationPanelForInstantOpen: (...args: unknown[]) =>
        hydrateNotificationPanelForInstantOpen(...args),
    isNotificationPanelModuleResolved: (...args: unknown[]) =>
        isNotificationPanelModuleResolved(...args),
    prefetchNotificationPanel: (...args: unknown[]) => prefetchNotificationPanel(...args),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: vi.fn(() => false),
}));

vi.mock('@/app/services/settings/settingsRuntime', () => ({
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { localOnlyMode: false },
        performance: { prefetchScreens: true, litePerformance: false },
    })),
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: vi.fn(() => false),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
}));

describe('notificationBootHydrator', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import('@/app/runtime/notificationBootHydrator');
        mod.resetNotificationBootHydratorForTests();
        isNotificationPanelModuleResolved.mockReturnValue(false);
    });

    it('hydrateNotificationShellForInstantOpen يحمّل chunk ويُطلق hydrated', async () => {
        const { hydrateNotificationShellForInstantOpen, NOTIFICATION_SHELL_HYDRATED_EVENT } =
            await import('@/app/runtime/notificationBootHydrator');

        const onHydrated = vi.fn();
        window.addEventListener(NOTIFICATION_SHELL_HYDRATED_EVENT, onHydrated);

        const ok = await hydrateNotificationShellForInstantOpen(true);

        expect(ok).toBe(true);
        expect(hydrateNotificationPanelForInstantOpen).toHaveBeenCalledTimes(1);
        expect(onHydrated).toHaveBeenCalledTimes(1);

        window.removeEventListener(NOTIFICATION_SHELL_HYDRATED_EVENT, onHydrated);
    });

    it('hydrateNotificationShellForInstantOpen(false) يتخطى التحميل عند تعطيل prefetch', async () => {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsRuntime');
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: true },
            performance: { prefetchScreens: false, litePerformance: false },
        } as ReturnType<typeof getLawyerSettingsSnapshot>);

        const { hydrateNotificationShellForInstantOpen } = await import(
            '@/app/runtime/notificationBootHydrator'
        );

        const ok = await hydrateNotificationShellForInstantOpen(false);

        expect(ok).toBe(false);
        expect(hydrateNotificationPanelForInstantOpen).not.toHaveBeenCalled();
    });

    it('bindNotificationBootHydrator لا يحمّل eagerly عند الربط الأول', async () => {
        const { bindNotificationBootHydrator } = await import('@/app/runtime/notificationBootHydrator');

        const unbind = bindNotificationBootHydrator();
        expect(prefetchNotificationPanel).not.toHaveBeenCalled();
        expect(hydrateNotificationPanelForInstantOpen).not.toHaveBeenCalled();
        unbind();
    });
});
