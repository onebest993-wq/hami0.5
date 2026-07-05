import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const scheduleLawyerShellPrefetch = vi.fn();
const scheduleIdleWork = vi.fn((fn: () => void) => {
    fn();
    return () => undefined;
});

vi.mock('@/app/runtime/deferredFeatureStyles', () => ({
    scheduleDeferredFeatureStyles: vi.fn(),
}));

vi.mock('@/app/runtime/deferredShellPrefetch', () => ({
    scheduleLawyerShellPrefetch: (...args: unknown[]) => scheduleLawyerShellPrefetch(...args),
    resetLawyerShellPrefetchForTests: vi.fn(),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void, opts?: unknown) => scheduleIdleWork(fn, opts),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: vi.fn(() => false),
}));

vi.mock('@/app/services/settings/settingsRuntime', () => ({
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { localOnlyMode: false },
        performance: { prefetchScreens: true },
    })),
}));

const warmLawyerDashboardHeaderShell = vi.fn();
const hydrateLawyerDashboardHeaderShellChunks = vi.fn();

vi.mock('@/app/hooks/lawyerDashboard/headerShellIntentWarm', () => ({
    warmLawyerDashboardHeaderShell: (...args: unknown[]) => warmLawyerDashboardHeaderShell(...args),
    hydrateLawyerDashboardHeaderShellChunks: (...args: unknown[]) =>
        hydrateLawyerDashboardHeaderShellChunks(...args),
    resetHeaderShellIntentWarmForTests: vi.fn(),
}));

describe('dashboardPostInteractiveWarm', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
        const mod = await import('@/app/runtime/dashboardPostInteractiveWarm');
        mod.resetDashboardPostInteractiveWarmForTests();
    });

    afterEach(async () => {
        const mod = await import('@/app/runtime/dashboardPostInteractiveWarm');
        mod.resetDashboardPostInteractiveWarmForTests();
    });

    it('scheduleDashboardPostInteractiveWarm يُجدول shell خفيفاً مرة واحدة ويسخّن الهيدر فوراً', async () => {
        const { scheduleDashboardPostInteractiveWarm } = await import('@/app/runtime/dashboardPostInteractiveWarm');

        scheduleDashboardPostInteractiveWarm('lawyer-1');
        scheduleDashboardPostInteractiveWarm('lawyer-1');
        await Promise.resolve();

        expect(hydrateLawyerDashboardHeaderShellChunks).toHaveBeenCalledTimes(1);
        expect(hydrateLawyerDashboardHeaderShellChunks).toHaveBeenCalledWith('lawyer-1');
        expect(scheduleIdleWork).toHaveBeenCalledTimes(1);
        expect(scheduleLawyerShellPrefetch).toHaveBeenCalledTimes(1);
    });

    it('bindDashboardPostInteractiveWarm يسخّن الهيدر فور الربط ولا يكرّر عند الحدث', async () => {
        const { bindDashboardPostInteractiveWarm } = await import('@/app/runtime/dashboardPostInteractiveWarm');

        const unbind = bindDashboardPostInteractiveWarm('lawyer-2');
        await Promise.resolve();

        expect(hydrateLawyerDashboardHeaderShellChunks).toHaveBeenCalledTimes(1);
        expect(hydrateLawyerDashboardHeaderShellChunks).toHaveBeenCalledWith('lawyer-2');
        expect(scheduleLawyerShellPrefetch).toHaveBeenCalledTimes(1);

        window.dispatchEvent(new Event('hami:dashboard-interactive'));
        await Promise.resolve();

        expect(hydrateLawyerDashboardHeaderShellChunks).toHaveBeenCalledTimes(1);
        expect(scheduleLawyerShellPrefetch).toHaveBeenCalledTimes(1);
        unbind();
    });

    it('لا يُحمّل shell عند تعطيل prefetchScreens', async () => {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsRuntime');
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: false },
        } as never);

        const { scheduleDashboardPostInteractiveWarm } = await import('@/app/runtime/dashboardPostInteractiveWarm');
        scheduleDashboardPostInteractiveWarm();

        expect(scheduleLawyerShellPrefetch).not.toHaveBeenCalled();
    });
});

