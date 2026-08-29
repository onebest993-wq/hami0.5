import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLiveNow } from '../useLiveNow';

describe('useLiveNow', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('يثبّت نفس المرجع داخل اليوم ويحدّثه عند تغيّر التاريخ', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 7, 23, 23, 50, 0));
        const { result } = renderHook(() => useLiveNow(true));
        const first = result.current;
        expect(first.toDateString()).toBe(new Date(2026, 7, 23).toDateString());

        act(() => {
            vi.advanceTimersByTime(60_000);
        });
        expect(result.current).toBe(first);

        act(() => {
            vi.setSystemTime(new Date(2026, 7, 24, 0, 1, 0));
            vi.advanceTimersByTime(60_000);
        });
        expect(result.current.toDateString()).toBe(new Date(2026, 7, 24).toDateString());
    });
});
