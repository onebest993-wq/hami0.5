import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    rememberOpenedSectionChunk,
    resetSectionChunkRecencyForTests,
} from '@/app/runtime/sectionChunkRecency';

const scheduleIdleWork = vi.fn((fn: () => void) => {
    return () => undefined;
});

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void, opts?: unknown) => scheduleIdleWork(fn, opts),
}));

vi.mock('@/app/runtime/yieldToMain', () => ({
    yieldToMain: () => Promise.resolve(),
    runWarmSteps: async (
        steps: Array<() => void | Promise<void>>,
        isCancelled?: () => boolean,
    ) => {
        for (const step of steps) {
            if (isCancelled?.()) return;
            await step();
        }
    },
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: vi.fn(() => false),
    isMeteredOrSlowNetwork: vi.fn(() => false),
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
        resetSectionChunkRecencyForTests();
        const { isLitePerformanceActive, isMeteredOrSlowNetwork } = await import(
            '@/app/runtime/devicePerformanceTier'
        );
        vi.mocked(isLitePerformanceActive).mockReturnValue(false);
        vi.mocked(isMeteredOrSlowNetwork).mockReturnValue(false);
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
        await vi.waitFor(() => {
            expect(warmExecutionWorkspace).toHaveBeenCalledWith({ includeSecondary: true });
            expect(warmLawsuitWorkspace).toHaveBeenCalledWith({ includeSecondary: false });
            expect(prefetchExecutionDashboardByMode).toHaveBeenCalledWith('deferred');
            expect(prefetchLawsuitArchiveContent).toHaveBeenCalledTimes(1);
            expect(prefetchExecutionArchiveContent).toHaveBeenCalledTimes(1);
        });
    });

    it('scheduleHeavyDashboardSectionWarm يجدول على الخمول بلا انتظار جداري', async () => {
        const { scheduleHeavyDashboardSectionWarm } = await import(
            '@/app/runtime/heavyDashboardSectionWarm'
        );

        scheduleHeavyDashboardSectionWarm();
        expect(scheduleIdleWork).toHaveBeenCalledWith(expect.any(Function), {
            minDelayMs: 0,
            timeoutMs: 6_000,
        });
        const warmFn = scheduleIdleWork.mock.calls[0]?.[0] as (() => void) | undefined;
        warmFn?.();
        await vi.waitFor(() => {
            expect(prefetchExecutionArchiveOpen).toHaveBeenCalledTimes(1);
        });
    });

    it('باطن آخر قسم دعاوى يُجدول أبكر من الموجة الكاملة', async () => {
        rememberOpenedSectionChunk('lawsuit');
        const native = await import('@/app/runtime/nativePlatform');
        vi.mocked(native.isCapacitorNativePlatform).mockReturnValue(true);
        const { resetHeavyDashboardSectionWarmForTests, scheduleHeavyDashboardSectionWarm } =
            await import('@/app/runtime/heavyDashboardSectionWarm');
        resetHeavyDashboardSectionWarmForTests();
        scheduleIdleWork.mockClear();
        scheduleHeavyDashboardSectionWarm();
        expect(scheduleIdleWork).toHaveBeenCalledTimes(2);
        expect(scheduleIdleWork).toHaveBeenNthCalledWith(1, expect.any(Function), {
            minDelayMs: 0,
            timeoutMs: 4_000,
        });
        expect(scheduleIdleWork).toHaveBeenNthCalledWith(2, expect.any(Function), {
            minDelayMs: 0,
            timeoutMs: 6_000,
        });
    });

    it('recency دعاوى لا يجدول تسخين الدعاوى المبكر المكرر', async () => {
        rememberOpenedSectionChunk('lawsuit');
        const { scheduleLawsuitArchiveEarlyWarm } = await import(
            '@/app/runtime/heavyDashboardSectionWarm'
        );
        scheduleIdleWork.mockClear();
        scheduleLawsuitArchiveEarlyWarm();
        expect(scheduleIdleWork).not.toHaveBeenCalled();
    });

    it('على lite يسخّن باطن آخر قسم تنفيذ فقط', async () => {
        rememberOpenedSectionChunk('execution');
        const { isLitePerformanceActive } = await import('@/app/runtime/devicePerformanceTier');
        vi.mocked(isLitePerformanceActive).mockReturnValue(true);
        const native = await import('@/app/runtime/nativePlatform');
        vi.mocked(native.isCapacitorNativePlatform).mockReturnValue(true);
        const { resetHeavyDashboardSectionWarmForTests, scheduleHeavyDashboardSectionWarm } =
            await import('@/app/runtime/heavyDashboardSectionWarm');
        resetHeavyDashboardSectionWarmForTests();
        scheduleIdleWork.mockClear();
        scheduleHeavyDashboardSectionWarm();
        expect(scheduleIdleWork).toHaveBeenCalledTimes(1);
        expect(scheduleIdleWork).toHaveBeenCalledWith(expect.any(Function), {
            minDelayMs: 0,
            timeoutMs: 4_000,
        });
    });

    it('على lite بلا recency تنفيذ/دعاوى لا يُجدول تسخين باطن', async () => {
        const { isLitePerformanceActive } = await import('@/app/runtime/devicePerformanceTier');
        vi.mocked(isLitePerformanceActive).mockReturnValue(true);
        const { resetHeavyDashboardSectionWarmForTests, scheduleHeavyDashboardSectionWarm } =
            await import('@/app/runtime/heavyDashboardSectionWarm');
        resetHeavyDashboardSectionWarmForTests();
        scheduleIdleWork.mockClear();
        scheduleHeavyDashboardSectionWarm();
        expect(scheduleIdleWork).not.toHaveBeenCalled();
    });

    it('على 2G بلا recency تنفيذ/دعاوى لا يُجدول تسخين باطن', async () => {
        const { isMeteredOrSlowNetwork } = await import('@/app/runtime/devicePerformanceTier');
        vi.mocked(isMeteredOrSlowNetwork).mockReturnValue(true);
        const { resetHeavyDashboardSectionWarmForTests, scheduleHeavyDashboardSectionWarm } =
            await import('@/app/runtime/heavyDashboardSectionWarm');
        resetHeavyDashboardSectionWarmForTests();
        scheduleIdleWork.mockClear();
        scheduleHeavyDashboardSectionWarm();
        expect(scheduleIdleWork).not.toHaveBeenCalled();
    });

    it('على 2G يسخّن باطن آخر قسم تنفيذ فقط', async () => {
        rememberOpenedSectionChunk('execution');
        const { isMeteredOrSlowNetwork } = await import('@/app/runtime/devicePerformanceTier');
        vi.mocked(isMeteredOrSlowNetwork).mockReturnValue(true);
        const { resetHeavyDashboardSectionWarmForTests, scheduleHeavyDashboardSectionWarm } =
            await import('@/app/runtime/heavyDashboardSectionWarm');
        resetHeavyDashboardSectionWarmForTests();
        scheduleIdleWork.mockClear();
        scheduleHeavyDashboardSectionWarm();
        expect(scheduleIdleWork).toHaveBeenCalledTimes(1);
        expect(scheduleIdleWork).toHaveBeenCalledWith(expect.any(Function), {
            minDelayMs: 0,
            timeoutMs: 4_000,
        });
    });

    it('باطن آخر قسم تنفيذ يُجدول أبكر من الموجة الكاملة', async () => {
        rememberOpenedSectionChunk('execution');
        const native = await import('@/app/runtime/nativePlatform');
        vi.mocked(native.isCapacitorNativePlatform).mockReturnValue(true);
        const { resetHeavyDashboardSectionWarmForTests, scheduleHeavyDashboardSectionWarm } =
            await import('@/app/runtime/heavyDashboardSectionWarm');
        resetHeavyDashboardSectionWarmForTests();
        scheduleIdleWork.mockClear();
        scheduleHeavyDashboardSectionWarm();
        expect(scheduleIdleWork).toHaveBeenCalledTimes(2);
        expect(scheduleIdleWork).toHaveBeenNthCalledWith(1, expect.any(Function), {
            minDelayMs: 0,
            timeoutMs: 4_000,
        });
        expect(scheduleIdleWork).toHaveBeenNthCalledWith(2, expect.any(Function), {
            minDelayMs: 0,
            timeoutMs: 6_000,
        });
    });

    it('scheduleLawsuitArchiveEarlyWarm يسخّن الدعاوى على الخمول بلا انتظار جداري', async () => {
        const { scheduleLawsuitArchiveEarlyWarm, warmLawsuitArchiveEarly } = await import(
            '@/app/runtime/heavyDashboardSectionWarm'
        );

        scheduleLawsuitArchiveEarlyWarm();
        expect(scheduleIdleWork).toHaveBeenCalledWith(expect.any(Function), {
            minDelayMs: 0,
            timeoutMs: 4_000,
        });

        warmLawsuitArchiveEarly();
        await vi.waitFor(() => {
            expect(warmLawsuitWorkspace).toHaveBeenCalledWith({ includeSecondary: false });
        });
        expect(prefetchLawsuitArchiveContent).toHaveBeenCalled();
    });

    it('لا ساعة جدارية ٨ ث / ٢٫٥ ث لباطن التنفيذ والدعاوى', async () => {
        const { lastOpenedHeavyInnerDelayMs, heavyDashboardFullWarmDelayMs } = await import(
            '@/app/runtime/heavyDashboardSectionWarm'
        );
        expect(lastOpenedHeavyInnerDelayMs()).toBe(0);
        expect(heavyDashboardFullWarmDelayMs()).toBe(0);
    });
});
