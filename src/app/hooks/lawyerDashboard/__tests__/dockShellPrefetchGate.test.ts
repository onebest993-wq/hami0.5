import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    prefetchDockWidgetIntentDebounced,
    prefetchDockWidgetIntentImmediate,
    resetDockShellPrefetchGateForTests,
    scheduleVisibleDockWidgetsPrefetch,
} from '@/app/hooks/lawyerDashboard/dockShellPrefetchGate';

const prefetchDockWidgetIntent = vi.fn();
vi.mock('@/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch', () => ({
    prefetchDockWidgetIntent: (...args: unknown[]) => prefetchDockWidgetIntent(...args),
}));

describe('prefetchDockWidgetIntentDebounced', () => {
    afterEach(() => {
        vi.clearAllMocks();
        resetDockShellPrefetchGateForTests();
        vi.useRealTimers();
    });

    it('يستدعي prefetch مرة واحدة ضمن نافذة التبريد', () => {
        prefetchDockWidgetIntentDebounced('dockTasks');
        prefetchDockWidgetIntentDebounced('dockTasks');
        prefetchDockWidgetIntentDebounced('dockTasks');
        expect(prefetchDockWidgetIntent).toHaveBeenCalledTimes(1);
        expect(prefetchDockWidgetIntent).toHaveBeenCalledWith('dockTasks', 'hover');
    });

    it('يسمح prefetch لـ widgets مختلفة', () => {
        prefetchDockWidgetIntentDebounced('dockTasks');
        prefetchDockWidgetIntentDebounced('dockCalendar');
        expect(prefetchDockWidgetIntent).toHaveBeenCalledTimes(2);
    });
});

describe('prefetchDockWidgetIntentImmediate', () => {
    afterEach(() => {
        vi.clearAllMocks();
        resetDockShellPrefetchGateForTests();
    });

    it('يستدعي prefetch فوراً حتى ضمن نافذة التبريد', () => {
        prefetchDockWidgetIntentDebounced('dockTasks');
        expect(prefetchDockWidgetIntent).toHaveBeenCalledTimes(1);

        prefetchDockWidgetIntentImmediate('dockTasks');
        expect(prefetchDockWidgetIntent).toHaveBeenCalledTimes(2);
        expect(prefetchDockWidgetIntent).toHaveBeenLastCalledWith('dockTasks', 'open');
    });
});

describe('scheduleVisibleDockWidgetsPrefetch', () => {
    afterEach(() => {
        vi.clearAllMocks();
        resetDockShellPrefetchGateForTests();
        vi.useRealTimers();
    });

    it('يجدول prefetch تدريجي لأيقونات الدوك', () => {
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
        vi.runAllTimers();
        expect(prefetchDockWidgetIntent).toHaveBeenCalledTimes(2);
        ric.mockRestore();
    });

    it('يلغي prefetch المجدول عند التنظيف', () => {
        vi.useFakeTimers();
        const ric = vi.spyOn(window, 'requestIdleCallback').mockImplementation((cb) => {
            return window.setTimeout(() => {
                cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
            }, 500) as unknown as number;
        });

        const cancel = scheduleVisibleDockWidgetsPrefetch(['dockTasks', 'dockCalendar']);
        cancel();
        vi.advanceTimersByTime(2_000);

        expect(prefetchDockWidgetIntent).not.toHaveBeenCalled();
        ric.mockRestore();
    });

    it('لا يجدول prefetch عندما تكون الصفحة مخفية', () => {
        vi.useFakeTimers();
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });

        const ric = vi.spyOn(window, 'requestIdleCallback').mockImplementation((cb) => {
            cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
            return 1;
        });

        scheduleVisibleDockWidgetsPrefetch(['dockTasks']);
        vi.runAllTimers();

        expect(prefetchDockWidgetIntent).not.toHaveBeenCalled();
        ric.mockRestore();
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    });
});
