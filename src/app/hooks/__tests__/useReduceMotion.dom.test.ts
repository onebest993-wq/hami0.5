import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';

describe('useReduceMotion DOM behavior', () => {
    beforeEach(() => {
        document.documentElement.dataset.hamiReduceMotion = '0';
        document.documentElement.dataset.hamiLite = '0';
    });

    afterEach(() => {
        delete document.documentElement.dataset.hamiReduceMotion;
        delete document.documentElement.dataset.hamiLite;
    });

    it('يحترم data-hami-reduce-motion من DOM', () => {
        document.documentElement.dataset.hamiReduceMotion = '1';
        const { result } = renderHook(() => useReduceMotion());
        expect(result.current).toBe(true);
    });

    it('يتحدّث عند hami:settings-updated', () => {
        const { result } = renderHook(() => useReduceMotion());
        expect(result.current).toBe(false);

        act(() => {
            document.documentElement.dataset.hamiReduceMotion = '1';
            window.dispatchEvent(new Event('hami:settings-updated'));
        });

        expect(result.current).toBe(true);
    });
});
