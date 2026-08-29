import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHeaderToolsReveal } from '@/app/components/lawyer/LawyerDashboardParts/components/useHeaderToolsReveal';
import type { PointerEvent } from 'react';

function pointer(partial: Partial<PointerEvent<HTMLElement>>): PointerEvent<HTMLElement> {
    return {
        button: 0,
        clientX: 10,
        clientY: 100,
        ...partial,
    } as PointerEvent<HTMLElement>;
}

describe('useHeaderToolsReveal', () => {
    it('يفتح بسحب للأسفل ويغلق بسحب للأعلى', () => {
        const { result } = renderHook(() => useHeaderToolsReveal());
        expect(result.current.open).toBe(false);

        act(() => {
            result.current.navPointer.onPointerDown(pointer({ clientY: 80 }));
            result.current.navPointer.onPointerMove(pointer({ clientY: 120 }));
            result.current.navPointer.onPointerUp(pointer({ clientY: 120 }));
        });
        expect(result.current.open).toBe(true);
        expect(result.current.bloom).toBe(true);

        act(() => {
            result.current.navPointer.onPointerDown(pointer({ clientY: 180 }));
            result.current.navPointer.onPointerMove(pointer({ clientY: 120 }));
            result.current.navPointer.onPointerUp(pointer({ clientY: 120 }));
        });
        expect(result.current.open).toBe(false);
    });

    it('يتجاهل السحب الذي يبدأ على زر أداة', () => {
        const { result } = renderHook(() => useHeaderToolsReveal());
        const tool = document.createElement('button');
        tool.className = 'hami-header-tool-btn';
        document.body.appendChild(tool);
        act(() => {
            result.current.navPointer.onPointerDown(
                pointer({ clientY: 120, target: tool }),
            );
            result.current.navPointer.onPointerMove(pointer({ clientY: 180, target: tool }));
            result.current.navPointer.onPointerUp(pointer({ clientY: 180, target: tool }));
        });
        expect(result.current.open).toBe(false);
        tool.remove();
    });

    it('لا يلغي الضغط لحركة أقل من عتبة السحب', () => {
        const { result } = renderHook(() => useHeaderToolsReveal());
        act(() => {
            result.current.navPointer.onPointerDown(pointer({ clientY: 80 }));
            result.current.navPointer.onPointerMove(pointer({ clientY: 92 }));
            result.current.navPointer.onPointerUp(pointer({ clientY: 92 }));
            result.current.toggle();
        });
        expect(result.current.open).toBe(true);
    });

    it('يغلق عبر close()', () => {
        const { result } = renderHook(() => useHeaderToolsReveal());
        act(() => {
            result.current.toggle();
        });
        expect(result.current.open).toBe(true);
        act(() => {
            result.current.close();
        });
        expect(result.current.open).toBe(false);
    });
});
