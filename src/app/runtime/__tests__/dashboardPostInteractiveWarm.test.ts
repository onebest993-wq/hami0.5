import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const scheduleLawyerShellPrefetch = vi.fn();
const scheduleIdleWork = vi.fn((fn: () => void) => {
    fn();
    return () => undefined;
});

vi.mock('@/app/runtime/deferredFeatureStyles', () => ({
    scheduleDeferredFeatureStyles: vi.fn(),
    ensureDeferredFeatureStylesLoaded: vi.fn(() => Promise.resolve()),
    prefetchDeferredFeatureStyles: vi.fn(),
}));

const scheduleHeavyDashboardSectionWarm = vi.fn(() => () => undefined);

vi.mock('@/app/runtime/heavyDashboardSectionWarm', () => ({
    scheduleHeavyDashboardSectionWarm: (...args: unknown[]) => scheduleHeavyDashboardSectionWarm(...args),
    resetHeavyDashboardSectionWarmForTests: vi.fn(),
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
        window.__hamiBootContentReady__ = false;
        const mod = await import('@/app/runtime/dashboardPostInteractiveWarm');
        mod.resetDashboardPostInteractiveWarmForTests();
    });

    afterEach(async () => {
        const mod = await import('@/app/runtime/dashboardPostInteractiveWarm');
        mod.resetDashboardPostInteractiveWarmForTests();
        window.__hamiBootContentReady__ = false;
    });

    it('scheduleDashboardPostInteractiveWarm يُجدول shell خفيفاً مرة واحدة ويسخّن الهيدر فوراً', async () => {
        const { scheduleDashboardPostInteractiveWarm } = await import(
            '@/app/runtime/dashboardPostInteractiveWarm'
        );

        scheduleDashboardPostInteractiveWarm('lawyer-1');
        scheduleDashboardPostInteractiveWarm('lawyer-1');
        await vi.waitFor(() => {
            expect(hydrateLawyerDashboardHeaderShellChunks).toHaveBeenCalledTimes(1);
        });
        expect(hydrateLawyerDashboardHeaderShellChunks).toHaveBeenCalledWith('lawyer-1');
        expect(scheduleIdleWork).toHaveBeenCalledTimes(1);
        expect(scheduleHeavyDashboardSectionWarm).toHaveBeenCalledTimes(1);
        expect(scheduleLawyerShellPrefetch).toHaveBeenCalledTimes(1);
    });

    it('bind ينتظر boot-content-ready قبل تسخين الهيدر', async () => {
        const { bindDashboardPostInteractiveWarm } = await import(
            '@/app/runtime/dashboardPostInteractiveWarm'
        );

        const unbind = bindDashboardPostInteractiveWarm('lawyer-2');
        await Promise.resolve();
        expect(hydrateLawyerDashboardHeaderShellChunks).not.toHaveBeenCalled();

        window.dispatchEvent(new Event('hami:boot-content-ready'));
        window.__hamiBootContentReady__ = true;
        await vi.waitFor(() => {
            expect(hydrateLawyerDashboardHeaderShellChunks).toHaveBeenCalledTimes(1);
        });
        expect(hydrateLawyerDashboardHeaderShellChunks).toHaveBeenCalledWith('lawyer-2');

        window.dispatchEvent(new Event('hami:boot-content-ready'));
        await Promise.resolve();
        expect(hydrateLawyerDashboardHeaderShellChunks).toHaveBeenCalledTimes(1);
        unbind();
    });

    it('bind يسخّن فوراً إن كان content-ready مسبقاً', async () => {
        window.__hamiBootContentReady__ = true;
        const { bindDashboardPostInteractiveWarm } = await import(
            '@/app/runtime/dashboardPostInteractiveWarm'
        );

        const unbind = bindDashboardPostInteractiveWarm('lawyer-3');
        await vi.waitFor(() => {
            expect(hydrateLawyerDashboardHeaderShellChunks).toHaveBeenCalledTimes(1);
        });
        unbind();
    });

    it('bind بعد unbind يعيد تسخين الهيدر وربط hydrator', async () => {
        window.__hamiBootContentReady__ = true;
        const { bindDashboardPostInteractiveWarm } = await import(
            '@/app/runtime/dashboardPostInteractiveWarm'
        );

        const unbind1 = bindDashboardPostInteractiveWarm('lawyer-a');
        await vi.waitFor(() => {
            expect(hydrateLawyerDashboardHeaderShellChunks).toHaveBeenCalledWith('lawyer-a');
        });
        unbind1();

        hydrateLawyerDashboardHeaderShellChunks.mockClear();

        const unbind2 = bindDashboardPostInteractiveWarm('lawyer-b');
        await vi.waitFor(() => {
            expect(hydrateLawyerDashboardHeaderShellChunks).toHaveBeenCalledWith('lawyer-b');
        });
        unbind2();
    });
});
