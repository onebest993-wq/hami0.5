import { describe, expect, it, vi, beforeEach } from 'vitest';

const scheduleIdleWork = vi.fn((fn: () => void) => {
    return () => undefined;
});

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void, opts?: unknown) => scheduleIdleWork(fn, opts),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: vi.fn(() => false),
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: vi.fn(() => true),
}));

const prefetchExecutionArchiveOpen = vi.fn();
const warmExecutionWorkspace = vi.fn();
const warmLawsuitWorkspace = vi.fn();
const prefetchExecutionDashboardByMode = vi.fn();
const prefetchLawsuitArchiveContent = vi.fn();
const prefetchExecutionArchiveContent = vi.fn();

vi.mock('@/app/runtime/executionArchiveOpenSession', () => ({
    prefetchExecutionArchiveOpen: (...args: unknown[]) => prefetchExecutionArchiveOpen(...args),
}));

vi.mock('@/app/runtime/executionWorkspaceWarm', () => ({
    warmExecutionWorkspace: (...args: unknown[]) => warmExecutionWorkspace(...args),
}));

vi.mock('@/app/runtime/lawsuitWorkspaceWarm', () => ({
    warmLawsuitWorkspace: (...args: unknown[]) => warmLawsuitWorkspace(...args),
}));

vi.mock('@/app/runtime/executionDashboardLoader', () => ({
    prefetchExecutionDashboardByMode: (...args: unknown[]) => prefetchExecutionDashboardByMode(...args),
}));

vi.mock('@/app/runtime/hubArchiveLoader', () => ({
    prefetchLawsuitArchiveContent: (...args: unknown[]) => prefetchLawsuitArchiveContent(...args),
    prefetchExecutionArchiveContent: (...args: unknown[]) => prefetchExecutionArchiveContent(...args),
}));

describe('heavyDashboardSectionWarm', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import('@/app/runtime/heavyDashboardSectionWarm');
        mod.resetHeavyDashboardSectionWarmForTests();
    });

    it('يسخّن مسارات التنفيذ والأرشيف والدعاوى مرة واحدة', async () => {
        const { warmHeavyDashboardSections } = await import('@/app/runtime/heavyDashboardSectionWarm');

        warmHeavyDashboardSections();
        warmHeavyDashboardSections();

        await vi.waitFor(() => {
            expect(prefetchExecutionArchiveOpen).toHaveBeenCalledTimes(1);
        });
        expect(warmExecutionWorkspace).toHaveBeenCalledWith({ includeSecondary: true });
        expect(warmLawsuitWorkspace).toHaveBeenCalledWith({ includeSecondary: false });
        expect(prefetchExecutionDashboardByMode).toHaveBeenCalledWith('deferred');
        expect(prefetchLawsuitArchiveContent).toHaveBeenCalledTimes(1);
        expect(prefetchExecutionArchiveContent).toHaveBeenCalledTimes(1);
    });

    it('scheduleHeavyDashboardSectionWarm يستخدم تأخيراً أقصر على الأصلي', async () => {
        const { scheduleHeavyDashboardSectionWarm } = await import(
            '@/app/runtime/heavyDashboardSectionWarm'
        );

        scheduleHeavyDashboardSectionWarm();
        expect(scheduleIdleWork).toHaveBeenCalledWith(expect.any(Function), {
            minDelayMs: 2_500,
            timeoutMs: 8_500,
        });
        const warmFn = scheduleIdleWork.mock.calls[0]?.[0] as (() => void) | undefined;
        warmFn?.();
        await vi.waitFor(() => {
            expect(prefetchExecutionArchiveOpen).toHaveBeenCalledTimes(1);
        });
    });

    it('scheduleLawsuitArchiveEarlyWarm يسخّن الدعاوى قبل heavy warm على الويب', async () => {
        const native = await import('@/app/runtime/nativePlatform');
        vi.mocked(native.isCapacitorNativePlatform).mockReturnValue(false);

        const { scheduleLawsuitArchiveEarlyWarm, warmLawsuitArchiveEarly } = await import(
            '@/app/runtime/heavyDashboardSectionWarm'
        );

        scheduleLawsuitArchiveEarlyWarm();
        expect(scheduleIdleWork).toHaveBeenCalledWith(expect.any(Function), {
            minDelayMs: 2_500,
            timeoutMs: 6_500,
        });

        warmLawsuitArchiveEarly();
        await vi.waitFor(() => {
            expect(warmLawsuitWorkspace).toHaveBeenCalledWith({ includeSecondary: false });
        });
        expect(prefetchLawsuitArchiveContent).toHaveBeenCalled();
    });
});
