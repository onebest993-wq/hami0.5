import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeferHeavyMount } from '@/app/components/lawyer/dashboard/useDeferHeavyMount';

describe('useDeferHeavyMount', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('يبدأ غير جاهز ثم يصبح جاهزاً بعد إطارين', async () => {
        const { result } = renderHook(() => useDeferHeavyMount(true));
        expect(result.current).toBe(false);

        await act(async () => {
            // rAF مزدوج
            if (typeof requestAnimationFrame === 'function') {
                await Promise.resolve();
                await Promise.resolve();
            }
            vi.runAllTimers();
        });

        expect(result.current).toBe(true);
    });

    it('enabled=false → جاهز فوراً', () => {
        const { result } = renderHook(() => useDeferHeavyMount(false));
        expect(result.current).toBe(true);
    });
});
