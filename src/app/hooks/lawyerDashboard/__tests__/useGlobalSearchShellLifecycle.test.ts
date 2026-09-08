import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGlobalSearchShellLifecycle } from '@/app/hooks/lawyerDashboard/useGlobalSearchShellLifecycle';

const mocks = vi.hoisted(() => ({
    isResolvedMock: vi.fn(() => false),
    markPhaseMock: vi.fn(),
    reportPerfMock: vi.fn(),
    observeInteractiveMock: vi.fn<
        (opts: { isDone: () => boolean; onInteractive: () => void }) => () => void
    >(() => () => undefined),
}));

vi.mock('@/app/runtime/globalSearchModuleState', () => ({
    isGlobalSearchOverlayModuleResolved: mocks.isResolvedMock,
}));

vi.mock('@/app/services/search/globalSearchPerfMetrics', () => ({
    markGlobalSearchPerfPhase: mocks.markPhaseMock,
    reportGlobalSearchPerf: mocks.reportPerfMock,
}));

vi.mock('@/app/hooks/lawyerDashboard/observeGlobalSearchOverlayInteractive', () => ({
    observeGlobalSearchOverlayInteractive: (opts: {
        isDone: () => boolean;
        onInteractive: () => void;
    }) => {
        const stop = mocks.observeInteractiveMock(opts);
        return stop;
    },
}));

describe('useGlobalSearchShellLifecycle — cleanup على الإغلاق المبكر', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('عند الإغلاق المبكر قبل 1.2 ثانية — يُلغي fallback ولا يُطلق تقرير بعد الإغلاق', () => {
        let stopObserver: (() => void) | null = null;
        mocks.observeInteractiveMock.mockImplementation(() => {
            const stop = vi.fn();
            stopObserver = stop;
            return stop;
        });

        const { rerender } = renderHook(
            ({ isOpen }) => useGlobalSearchShellLifecycle(isOpen, 'user-1', false),
            { initialProps: { isOpen: true as boolean } },
        );

        expect(mocks.markPhaseMock).toHaveBeenCalledWith('first-paint');
        expect(stopObserver).not.toBeNull();
        expect(mocks.observeInteractiveMock).toHaveBeenCalledTimes(1);
        expect(mocks.reportPerfMock).not.toHaveBeenCalled();

        rerender({ isOpen: false });

        expect(stopObserver).toHaveBeenCalledTimes(1);
        expect(mocks.reportPerfMock).not.toHaveBeenCalled();

        vi.advanceTimersByTime(2_000);
        expect(mocks.reportPerfMock).not.toHaveBeenCalled();
        expect(mocks.markPhaseMock).not.toHaveBeenCalledWith('interactive');
    });

    it('إعادة الفتح بعد إغلاق مبكر — يُنشئ observer جديدًا ولا يستدعي القديم', () => {
        const stopCalls: Array<() => void> = [];
        const onInteractiveCalls: Array<() => void> = [];

        mocks.observeInteractiveMock.mockImplementation((opts) => {
            const stop = vi.fn();
            stopCalls.push(stop);
            onInteractiveCalls.push(opts.onInteractive);
            return stop;
        });

        const { rerender } = renderHook(
            ({ isOpen }) => useGlobalSearchShellLifecycle(isOpen, 'user-2', false),
            { initialProps: { isOpen: true as boolean } },
        );

        expect(stopCalls.length).toBe(1);

        rerender({ isOpen: false });
        expect(stopCalls[0]).toHaveBeenCalledTimes(1);

        rerender({ isOpen: true });
        expect(stopCalls.length).toBe(2);
        expect(stopCalls[0]).toHaveBeenCalledTimes(1);

        onInteractiveCalls[0]();
        expect(mocks.reportPerfMock).not.toHaveBeenCalled();

        onInteractiveCalls[1]();
        expect(mocks.reportPerfMock).toHaveBeenCalledTimes(1);
        expect(mocks.markPhaseMock).toHaveBeenCalledWith('interactive');
    });

    it('بدون userId — يُلغي fallback الفوري عند الإغلاق المبكر', () => {
        const { rerender } = renderHook(
            ({ isOpen }) => useGlobalSearchShellLifecycle(isOpen, '', true),
            { initialProps: { isOpen: true as boolean } },
        );

        expect(mocks.markPhaseMock).toHaveBeenCalledWith('first-paint');

        rerender({ isOpen: false });

        vi.advanceTimersByTime(100);
        expect(mocks.reportPerfMock).not.toHaveBeenCalled();
        expect(mocks.markPhaseMock).not.toHaveBeenCalledWith('interactive');
    });

    it('3 دورات reopen سريعة متتالية — فقط آخر جلسة (الأحدث) تُبلغ عن مقياس واحد والتقارير القديمة مرفوضة بالكامل', () => {
        const onInteractiveCalls: Array<() => void> = [];
        let sessionForCallback = 0;

        mocks.observeInteractiveMock.mockImplementation((opts) => {
            sessionForCallback += 1;
            onInteractiveCalls.push(opts.onInteractive);
            const stop = vi.fn();
            return stop;
        });

        const { rerender } = renderHook(
            ({ isOpen }) => useGlobalSearchShellLifecycle(isOpen, 'user-3', true),
            { initialProps: { isOpen: true as boolean } },
        );

        rerender({ isOpen: false });
        rerender({ isOpen: true });
        rerender({ isOpen: false });
        rerender({ isOpen: true });

        expect(onInteractiveCalls.length).toBe(3);

        onInteractiveCalls[0]();
        onInteractiveCalls[1]();
        onInteractiveCalls[2]();

        expect(mocks.reportPerfMock).toHaveBeenCalledTimes(1);
        expect(mocks.markPhaseMock).toHaveBeenLastCalledWith('interactive');
        expect(mocks.markPhaseMock).toHaveBeenCalledWith('interactive');
    });
});
