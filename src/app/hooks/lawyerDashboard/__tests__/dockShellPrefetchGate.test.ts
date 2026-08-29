import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    armHeavyDockWidgetsIdlePrefetch,
    prefetchDockWidgetIntentDebounced,
    prefetchDockWidgetIntentImmediate,
    resetDockShellPrefetchGateForTests,
    scheduleHeavyDockWidgetsIdlePrefetch,
    scheduleVisibleDockWidgetsPrefetch,
} from '@/app/hooks/lawyerDashboard/dockShellPrefetchGate';

const prefetchDockWidgetIntent = vi.fn();
vi.mock('@/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch', () => ({
    prefetchDockWidgetIntent: (...args: unknown[]) => prefetchDockWidgetIntent(...args),
}));

async function waitForPrefetchCalls(count: number): Promise<void> {
    await vi.waitFor(() => expect(prefetchDockWidgetIntent).toHaveBeenCalledTimes(count), {
        timeout: 1000,
    });
}

describe('prefetchDockWidgetIntentDebounced', () => {
    afterEach(() => {
        vi.clearAllMocks();
        resetDockShellPrefetchGateForTests();
        vi.useRealTimers();
    });

    it('يستدعي prefetch مرة واحدة ضمن نافذة التبريد', async () => {
        prefetchDockWidgetIntentDebounced('dockTasks');
        prefetchDockWidgetIntentDebounced('dockTasks');
        prefetchDockWidgetIntentDebounced('dockTasks');
        await waitForPrefetchCalls(1);
        expect(prefetchDockWidgetIntent).toHaveBeenCalledWith('dockTasks', 'hover');
    });

    it('يسمح prefetch لـ widgets مختلفة', async () => {
        prefetchDockWidgetIntentDebounced('dockTasks');
        await waitForPrefetchCalls(1);
        prefetchDockWidgetIntentDebounced('dockCalendar');
        await waitForPrefetchCalls(2);
    });
});

describe('prefetchDockWidgetIntentImmediate', () => {
    afterEach(() => {
        vi.clearAllMocks();
        resetDockShellPrefetchGateForTests();
    });

    it('يستدعي prefetch فوراً حتى ضمن نافذة التبريد', async () => {
        prefetchDockWidgetIntentDebounced('dockTasks');
        await vi.waitFor(() => expect(prefetchDockWidgetIntent).toHaveBeenCalledTimes(1));

        prefetchDockWidgetIntentImmediate('dockTasks');
        await vi.waitFor(() => expect(prefetchDockWidgetIntent).toHaveBeenCalledTimes(2));
        expect(prefetchDockWidgetIntent).toHaveBeenLastCalledWith('dockTasks', 'open');
    });
});

describe('scheduleVisibleDockWidgetsPrefetch', () => {
    afterEach(() => {
        vi.clearAllMocks();
        resetDockShellPrefetchGateForTests();
        vi.useRealTimers();
    });

    it('يجدول prefetch تدريجي لأيقونات الدوك', async () => {
        vi.useFakeTimers();
        if (typeof window.requestIdleCallback !== 'function') {
            (window as Window & { requestIdleCallback: typeof requestIdleCallback }).requestIdleCallback = (
                cb: IdleRequestCallback,
            ) => {
                cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
                return 1;
            };
        }
        const ric = vi.spyOn(window, 'requestIdleCallback');

        scheduleVisibleDockWidgetsPrefetch(['dockTasks', 'dockCalendar']);
        scheduleVisibleDockWidgetsPrefetch(['dockTasks', 'dockCalendar']);

        expect(ric).toHaveBeenCalledTimes(1);
        await vi.runAllTimersAsync();
        await waitForPrefetchCalls(2);
        ric.mockRestore();
    });

    it('يلغي prefetch المجدول عند التنظيف', async () => {
        vi.useFakeTimers();
        const ric = vi.spyOn(window, 'requestIdleCallback').mockImplementation((cb) => {
            return window.setTimeout(() => {
                cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
            }, 500) as unknown as number;
        });

        const cancel = scheduleVisibleDockWidgetsPrefetch(['dockTasks', 'dockCalendar']);
        cancel();
        await vi.advanceTimersByTimeAsync(2_000);

        expect(prefetchDockWidgetIntent).not.toHaveBeenCalled();
        ric.mockRestore();
    });

    it('لا يجدول prefetch عندما تكون الصفحة مخفية', async () => {
        vi.useFakeTimers();
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });

        const ric = vi.spyOn(window, 'requestIdleCallback').mockImplementation((cb) => {
            cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
            return 1;
        });

        scheduleVisibleDockWidgetsPrefetch(['dockTasks']);
        await vi.runAllTimersAsync();

        expect(prefetchDockWidgetIntent).not.toHaveBeenCalled();
        ric.mockRestore();
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    });
});

describe('scheduleHeavyDockWidgetsIdlePrefetch', () => {
    afterEach(() => {
        vi.clearAllMocks();
        resetDockShellPrefetchGateForTests();
        vi.useRealTimers();
    });

    it('لا يجدول الأقسام الثقيلة قبل نية البلاطة', async () => {
        vi.useFakeTimers();
        scheduleHeavyDockWidgetsIdlePrefetch(['hubLawsuit', 'hubExecution', 'dockTasks']);
        await vi.advanceTimersByTimeAsync(6_000);
        expect(prefetchDockWidgetIntent).not.toHaveBeenCalled();

        armHeavyDockWidgetsIdlePrefetch();
        await vi.advanceTimersByTimeAsync(500);
        expect(prefetchDockWidgetIntent).toHaveBeenCalledWith('hubLawsuit', 'hover');
        expect(prefetchDockWidgetIntent).toHaveBeenCalledWith('hubExecution', 'hover');
        expect(prefetchDockWidgetIntent).not.toHaveBeenCalledWith('dockTasks', 'hover');
    });

    it('يلغي موجة الثقيل إن أُلغيت قبل نية البلاطة', async () => {
        vi.useFakeTimers();
        const cancel = scheduleHeavyDockWidgetsIdlePrefetch(['hubLawsuit']);
        cancel();
        armHeavyDockWidgetsIdlePrefetch();
        await vi.advanceTimersByTimeAsync(500);
        expect(prefetchDockWidgetIntent).not.toHaveBeenCalled();
    });

    it('نية الثقيل لا تلغي تسخين الدوك الخفيف', async () => {
        vi.useFakeTimers();
        const ric = vi.spyOn(window, 'requestIdleCallback').mockImplementation((cb) => {
            return window.setTimeout(() => {
                cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
            }, 0) as unknown as number;
        });
        scheduleVisibleDockWidgetsPrefetch(['dockTasks']);
        scheduleHeavyDockWidgetsIdlePrefetch(['hubLawsuit']);
        armHeavyDockWidgetsIdlePrefetch();
        await vi.runAllTimersAsync();
        expect(prefetchDockWidgetIntent).toHaveBeenCalledWith('dockTasks', 'hover');
        expect(prefetchDockWidgetIntent).toHaveBeenCalledWith('hubLawsuit', 'hover');
        ric.mockRestore();
    });
});
