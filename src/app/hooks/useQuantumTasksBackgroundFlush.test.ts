import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQuantumTasksBackgroundFlush } from './useQuantumTasksBackgroundFlush';

describe('useQuantumTasksBackgroundFlush', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يفرّغ فور pagehide', () => {
        const flush = vi.fn();
        renderHook(() => useQuantumTasksBackgroundFlush(flush));
        window.dispatchEvent(new Event('pagehide'));
        expect(flush).toHaveBeenCalledTimes(1);
    });

    it('يفرّغ بعد تأخير عند إخفاء التبويب ويلغي عند العودة', () => {
        const flush = vi.fn();
        renderHook(() => useQuantumTasksBackgroundFlush(flush));

        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
        vi.advanceTimersByTime(800);
        expect(flush).not.toHaveBeenCalled();

        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
        });
        document.dispatchEvent(new Event('visibilitychange'));
        vi.advanceTimersByTime(2000);
        expect(flush).not.toHaveBeenCalled();

        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
        vi.advanceTimersByTime(900);
        expect(flush).toHaveBeenCalledTimes(1);
    });

    it('يفرّغ فوراً عند إرسال Capacitor للخلفية', () => {
        const flush = vi.fn();
        renderHook(() => useQuantumTasksBackgroundFlush(flush));
        window.dispatchEvent(new CustomEvent('hami-native-app-state', { detail: { isActive: false } }));
        expect(flush).toHaveBeenCalledTimes(1);
        window.dispatchEvent(new CustomEvent('hami-native-app-state', { detail: { isActive: true } }));
        expect(flush).toHaveBeenCalledTimes(1);
    });
});
