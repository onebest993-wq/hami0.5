import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useArmedPointerAction } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useArmedPointerAction';

function pointerDown(button = 0, pointerType = 'mouse') {
    return { button, pointerType } as never;
}

describe('useArmedPointerAction', () => {
    it('الشجرة الحية: pointerdown لا ينفّذ — click فقط', () => {
        const action = vi.fn();
        const { result } = renderHook(() => useArmedPointerAction(action));

        act(() => {
            result.current.onPointerDown(pointerDown());
        });
        expect(action).not.toHaveBeenCalled();

        act(() => {
            result.current.onClick();
        });
        expect(action).toHaveBeenCalledTimes(1);
    });

    it('غطاء الفتح: pointerdown ينفّذ ويبتلع click التالي', () => {
        const action = vi.fn();
        const { result } = renderHook(() =>
            useArmedPointerAction(action, { armOnPointerDown: true }),
        );

        act(() => {
            result.current.onPointerDown(pointerDown(0, 'touch'));
        });
        expect(action).toHaveBeenCalledTimes(1);

        act(() => {
            result.current.onClick();
        });
        expect(action).toHaveBeenCalledTimes(1);
    });
});
