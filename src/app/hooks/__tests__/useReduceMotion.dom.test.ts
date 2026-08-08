import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';

describe('useReduceMotion DOM behavior', () => {
    beforeEach(() => {
        document.documentElement.dataset.hamiReduceMotion = '0';
        document.documentElement.dataset.hamiAnimations = '1';
        document.documentElement.dataset.hamiLite = '0';
    });

    afterEach(() => {
        delete document.documentElement.dataset.hamiReduceMotion;
        delete document.documentElement.dataset.hamiAnimations;
        delete document.documentElement.dataset.hamiLite;
        document.documentElement.classList.remove('hami-high-contrast');
    });

    it('يحترم data-hami-reduce-motion من DOM', () => {
        document.documentElement.dataset.hamiReduceMotion = '1';
        const { result } = renderHook(() => useReduceMotion());
        expect(result.current).toBe(true);
    });

    it('يتحدّث فوراً عند تغيير data-hami-animations', async () => {
        const { result } = renderHook(() => useReduceMotion());
        expect(result.current).toBe(false);

        act(() => {
            document.documentElement.dataset.hamiAnimations = '0';
        });

        await waitFor(() => {
            expect(result.current).toBe(true);
        });
    });
});
