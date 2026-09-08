import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNotificationShellLifecycle } from '@/app/hooks/lawyerDashboard/useNotificationShellLifecycle';

const mocks = vi.hoisted(() => ({
    isResolvedMock: vi.fn(() => false),
    markPhaseMock: vi.fn(),
    reportPerfMock: vi.fn(),
    observeInteractiveMock: vi.fn<
        (opts: { isDone: () => boolean; onInteractive: () => void }) => () => void
    >(() => () => undefined),
}));

vi.mock('@/app/runtime/notificationPanelModuleState', () => ({
    isNotificationPanelModuleResolved: mocks.isResolvedMock,
}));

vi.mock('@/app/services/notifications/notificationPerfMetrics', () => ({
    markNotificationPerfPhase: mocks.markPhaseMock,
    reportNotificationPerf: mocks.reportPerfMock,
}));

vi.mock('@/app/hooks/lawyerDashboard/observeNotificationPanelInteractive', () => ({
    observeNotificationPanelInteractive: (opts: {
        isDone: () => boolean;
        onInteractive: () => void;
    }) => {
        const stop = mocks.observeInteractiveMock(opts);
        return stop;
    },
}));

describe('useNotificationShellLifecycle — cleanup على الإغلاق المبكر', () => {
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
            ({ isOpen }) => useNotificationShellLifecycle(isOpen, 'user-1', false),
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

    it('إعادة الفتح بعد إغلاق مبكر — لا يستقبل الجلسة الثانية تقريرًا من observer الجلسة الأولى', () => {
        const stopCalls: Array<() => void> = [];
        const onInteractiveCalls: Array<() => void> = [];

        mocks.observeInteractiveMock.mockImplementation((opts) => {
            const stop = vi.fn();
            stopCalls.push(stop);
            onInteractiveCalls.push(opts.onInteractive);
            return stop;
        });

        const { rerender } = renderHook(
            ({ isOpen }) => useNotificationShellLifecycle(isOpen, 'user-2', false),
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

    it('بدون userId — لا يُنشئ observer ولا fallback، وعند ظهور userId لاحقًا يشتغل بشكل طبيعي', () => {
        let stopObserver: (() => void) | null = null;
        mocks.observeInteractiveMock.mockImplementation(() => {
            const stop = vi.fn();
            stopObserver = stop;
            return stop;
        });

        const { rerender } = renderHook(
            ({ isOpen, userId }) => useNotificationShellLifecycle(isOpen, userId, true),
            { initialProps: { isOpen: true as boolean, userId: '' } },
        );

        expect(mocks.markPhaseMock).not.toHaveBeenCalledWith('first-paint');
        expect(mocks.observeInteractiveMock).not.toHaveBeenCalled();

        rerender({ isOpen: true, userId: 'user-3' });

        expect(mocks.markPhaseMock).toHaveBeenCalledWith('first-paint');
        expect(stopObserver).not.toBeNull();
        expect(mocks.observeInteractiveMock).toHaveBeenCalledTimes(1);

        rerender({ isOpen: false, userId: 'user-3' });
        expect(stopObserver).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(2_000);
        expect(mocks.reportPerfMock).not.toHaveBeenCalled();
    });

    it('3 مرات فتح متتالية عبر unmount/mount جديد — تقرير أداء واحد فقط للجلسة الأخيرة ولا تداخل', () => {
        const onInteractiveCalls: Array<() => void> = [];
        mocks.observeInteractiveMock.mockImplementation((opts) => {
            const stop = vi.fn();
            onInteractiveCalls.push(opts.onInteractive);
            return stop;
        });

        const { unmount: u1 } = renderHook(
            () => useNotificationShellLifecycle(true, 'user-4', false),
        );
        expect(onInteractiveCalls.length).toBe(1);
        u1();

        const { unmount: u2 } = renderHook(
            () => useNotificationShellLifecycle(true, 'user-4', false),
        );
        expect(onInteractiveCalls.length).toBe(2);
        u2();

        const { unmount: u3 } = renderHook(
            () => useNotificationShellLifecycle(true, 'user-4', false),
        );
        expect(onInteractiveCalls.length).toBe(3);

        onInteractiveCalls[0]();
        onInteractiveCalls[1]();
        expect(mocks.reportPerfMock).not.toHaveBeenCalled();

        onInteractiveCalls[2]();
        expect(mocks.reportPerfMock).toHaveBeenCalledTimes(1);
        expect(mocks.markPhaseMock).toHaveBeenCalledWith('interactive');

        u3();
    });
});
