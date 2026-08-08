import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { TouchEvent } from 'react';
import { useSheetSwipeDismiss } from '@/app/hooks/useSheetSwipeDismiss';

function touchStart(clientY: number): TouchEvent {
    return {
        touches: [{ clientY }],
    } as unknown as TouchEvent;
}

function touchEnd(clientY: number): TouchEvent {
    return {
        changedTouches: [{ clientY }],
    } as unknown as TouchEvent;
}

describe('useSheetSwipeDismiss', () => {
    it('يغلق عند السحب للأسفل فوق العتبة', () => {
        const onClose = vi.fn();
        const { result } = renderHook(() => useSheetSwipeDismiss(onClose, { enabled: true, thresholdPx: 88 }));

        act(() => {
            result.current.onTouchStart(touchStart(100));
            result.current.onTouchEnd(touchEnd(200));
        });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('لا يغلق عند سحب قصير', () => {
        const onClose = vi.fn();
        const { result } = renderHook(() => useSheetSwipeDismiss(onClose, { enabled: true, thresholdPx: 88 }));

        act(() => {
            result.current.onTouchStart(touchStart(100));
            result.current.onTouchEnd(touchEnd(150));
        });

        expect(onClose).not.toHaveBeenCalled();
    });

    it('لا يغلق عندما يكون معطّلاً', () => {
        const onClose = vi.fn();
        const { result } = renderHook(() => useSheetSwipeDismiss(onClose, { enabled: false }));

        act(() => {
            result.current.onTouchStart(touchStart(100));
            result.current.onTouchEnd(touchEnd(220));
        });

        expect(onClose).not.toHaveBeenCalled();
    });
});
