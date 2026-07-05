import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeepAliveIdleRelease } from '@/app/hooks/lawyerDashboard/useKeepAliveIdleRelease';

describe('useKeepAliveIdleRelease', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('لا يطلق release أثناء active', () => {
        const onRelease = vi.fn();
        renderHook(() => useKeepAliveIdleRelease(true, onRelease, 1_000));
        act(() => {
            vi.advanceTimersByTime(5_000);
        });
        expect(onRelease).not.toHaveBeenCalled();
    });

    it('يطلق release بعد idle عندما active=false', () => {
        const onRelease = vi.fn();
        renderHook(() => useKeepAliveIdleRelease(false, onRelease, 2_000));
        act(() => {
            vi.advanceTimersByTime(1_999);
        });
        expect(onRelease).not.toHaveBeenCalled();
        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(onRelease).toHaveBeenCalledTimes(1);
    });

    it('يُلغي release عند عودة active قبل انتهاء المؤقت', () => {
        const onRelease = vi.fn();
        const { rerender } = renderHook(
            ({ active }) => useKeepAliveIdleRelease(active, onRelease, 3_000),
            { initialProps: { active: false } },
        );
        act(() => {
            vi.advanceTimersByTime(2_000);
        });
        rerender({ active: true });
        act(() => {
            vi.advanceTimersByTime(5_000);
        });
        expect(onRelease).not.toHaveBeenCalled();
    });
});
