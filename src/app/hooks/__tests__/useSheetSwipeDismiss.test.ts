import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { PointerEvent } from 'react';
import { useSheetSwipeDismiss } from '@/app/hooks/useSheetSwipeDismiss';

function pointerEvent(
    clientY: number,
    extra: Partial<{ pointerId: number; pointerType: string; button: number }> = {},
): PointerEvent<HTMLElement> {
    return {
        clientY,
        pointerId: extra.pointerId ?? 1,
        pointerType: extra.pointerType ?? 'touch',
        button: extra.button ?? 0,
        currentTarget: {
            setPointerCapture: vi.fn(),
            releasePointerCapture: vi.fn(),
        },
        preventDefault: vi.fn(),
    } as unknown as PointerEvent<HTMLElement>;
}

describe('useSheetSwipeDismiss', () => {
    it('يغلق عند السحب للأسفل فوق العتبة', () => {
        const onClose = vi.fn();
        const { result } = renderHook(() => useSheetSwipeDismiss(onClose, { enabled: true, thresholdPx: 88 }));

        act(() => {
            result.current.onPointerDown(pointerEvent(100));
            result.current.onPointerUp(pointerEvent(200));
        });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('يغلق بسحب الفأرة فوق العتبة', () => {
        const onClose = vi.fn();
        const { result } = renderHook(() => useSheetSwipeDismiss(onClose, { enabled: true, thresholdPx: 88 }));

        act(() => {
            result.current.onPointerDown(pointerEvent(40, { pointerType: 'mouse' }));
            result.current.onPointerUp(pointerEvent(160, { pointerType: 'mouse' }));
        });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('لا يغلق عند سحب قصير', () => {
        const onClose = vi.fn();
        const { result } = renderHook(() => useSheetSwipeDismiss(onClose, { enabled: true, thresholdPx: 88 }));

        act(() => {
            result.current.onPointerDown(pointerEvent(100));
            result.current.onPointerUp(pointerEvent(150));
        });

        expect(onClose).not.toHaveBeenCalled();
    });

    it('لا يغلق عندما يكون معطّلاً', () => {
        const onClose = vi.fn();
        const { result } = renderHook(() => useSheetSwipeDismiss(onClose, { enabled: false }));

        act(() => {
            result.current.onPointerDown(pointerEvent(100));
            result.current.onPointerUp(pointerEvent(220));
        });

        expect(onClose).not.toHaveBeenCalled();
    });

    it('يتابع الإصبع دون إغلاق تحت العتبة', () => {
        const onClose = vi.fn();
        const onOffsetChange = vi.fn();
        const { result } = renderHook(() =>
            useSheetSwipeDismiss(onClose, {
                enabled: true,
                follow: true,
                thresholdPx: 88,
                onOffsetChange,
            }),
        );

        act(() => {
            result.current.onPointerDown(pointerEvent(100));
            result.current.onPointerMove(pointerEvent(160));
            result.current.onPointerUp(pointerEvent(160));
        });

        expect(onOffsetChange).toHaveBeenCalledWith(60);
        expect(onOffsetChange).toHaveBeenLastCalledWith(0);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('يغلق بالمتابعة فوق العتبة ويبقي الإزاحة للإغلاق', () => {
        const onClose = vi.fn();
        const onOffsetChange = vi.fn();
        const { result } = renderHook(() =>
            useSheetSwipeDismiss(onClose, {
                enabled: true,
                follow: true,
                thresholdPx: 88,
                onOffsetChange,
            }),
        );

        act(() => {
            result.current.onPointerDown(pointerEvent(100));
            result.current.onPointerMove(pointerEvent(200));
            result.current.onPointerUp(pointerEvent(200));
        });

        expect(onOffsetChange).toHaveBeenCalledWith(100);
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onOffsetChange).not.toHaveBeenLastCalledWith(0);
    });
});
