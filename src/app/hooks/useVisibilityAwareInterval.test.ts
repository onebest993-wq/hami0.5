import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useVisibilityAwareInterval } from './useVisibilityAwareInterval';
import { renderHook } from '@testing-library/react';

describe('useVisibilityAwareInterval', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('runs tick on interval when tab visible', () => {
        const tick = vi.fn();
        renderHook(() => useVisibilityAwareInterval(tick, 1000, true));
        expect(tick).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1000);
        expect(tick).toHaveBeenCalledTimes(1);
    });

    it('stops ticking when tab hidden and resumes on visible', () => {
        const tick = vi.fn();
        renderHook(() => useVisibilityAwareInterval(tick, 1000, true));
        vi.advanceTimersByTime(1000);
        expect(tick).toHaveBeenCalledTimes(1);

        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
        vi.advanceTimersByTime(3000);
        expect(tick).toHaveBeenCalledTimes(1);

        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(tick).toHaveBeenCalledTimes(2);
    });

    it('يتوقف عند pagehide وحالة التطبيق غير النشطة', () => {
        const tick = vi.fn();
        renderHook(() => useVisibilityAwareInterval(tick, 1000, true));
        vi.advanceTimersByTime(1000);
        expect(tick).toHaveBeenCalledTimes(1);

        window.dispatchEvent(new Event('pagehide'));
        vi.advanceTimersByTime(3000);
        expect(tick).toHaveBeenCalledTimes(1);

        window.dispatchEvent(new CustomEvent('hami-native-app-state', { detail: { isActive: true } }));
        expect(tick).toHaveBeenCalledTimes(2);
        vi.advanceTimersByTime(1000);
        expect(tick).toHaveBeenCalledTimes(3);

        window.dispatchEvent(new CustomEvent('hami-native-app-state', { detail: { isActive: false } }));
        vi.advanceTimersByTime(4000);
        expect(tick).toHaveBeenCalledTimes(3);
    });
});
