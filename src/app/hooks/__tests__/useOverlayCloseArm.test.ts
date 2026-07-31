import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOverlayCloseArm } from '@/app/hooks/useOverlayCloseArm';

describe('useOverlayCloseArm', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('blocks close until armed after open', () => {
        const close = vi.fn();
        const { result, rerender } = renderHook(
            ({ open }) => useOverlayCloseArm(open),
            { initialProps: { open: false } },
        );

        rerender({ open: true });
        act(() => {
            result.current.requestClose(close);
        });
        expect(close).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(320);
        });
        act(() => {
            result.current.requestClose(close);
        });
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('arms shortly after pointerup', () => {
        const close = vi.fn();
        const { result, rerender } = renderHook(
            ({ open }) => useOverlayCloseArm(open),
            { initialProps: { open: false } },
        );

        rerender({ open: true });
        act(() => {
            window.dispatchEvent(new Event('pointerup'));
            vi.advanceTimersByTime(80);
        });
        act(() => {
            result.current.requestClose(close);
        });
        expect(close).toHaveBeenCalledTimes(1);
    });
});
