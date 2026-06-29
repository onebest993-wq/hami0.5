import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileTextCanvasReveal } from '../useProfileTextCanvasReveal';
import { PETAL_CLEAR_PROGRESS } from '../constants';

function mountRevealHook(interaction: 'none' | 'tapReveal' | 'mistSwipe' | 'stardust' = 'tapReveal') {
    const wrapRef = { current: document.createElement('div') };
    const leafRefs = { current: [] as (HTMLSpanElement | null)[] };
    return renderHook(() =>
        useProfileTextCanvasReveal({
            interaction,
            canInteract: true,
            wrapRef,
            leafRefs,
        }),
    );
}

describe('useProfileTextCanvasReveal', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يبدأ مكشوفاً عندما interaction = none', () => {
        const { result } = mountRevealHook('none');
        expect(result.current.needsReveal).toBe(false);
        expect(result.current.revealed).toBe(true);
        expect(result.current.maskActive).toBe(false);
    });

    it('يبدأ مغطىً عند تفاعل الكشف', () => {
        const { result } = mountRevealHook('tapReveal');
        expect(result.current.needsReveal).toBe(true);
        expect(result.current.revealed).toBe(false);
        expect(result.current.maskActive).toBe(true);
        expect(result.current.showHint).toBe(true);
    });

    it('onTapReveal يكشف النص ويخفي التلميح', () => {
        const { result } = mountRevealHook('tapReveal');
        act(() => {
            result.current.onTapReveal();
        });
        expect(result.current.revealed).toBe(true);
        expect(result.current.maskActive).toBe(false);
        expect(result.current.showHint).toBe(false);
        expect(result.current.revealing).toBe(true);

        act(() => {
            vi.advanceTimersByTime(820);
        });
        expect(result.current.revealing).toBe(false);
    });

    it('لا يكشف عند canInteract = false', () => {
        const wrapRef = { current: document.createElement('div') };
        const leafRefs = { current: [] as (HTMLSpanElement | null)[] };
        const { result } = renderHook(() =>
            useProfileTextCanvasReveal({
                interaction: 'tapReveal',
                canInteract: false,
                wrapRef,
                leafRefs,
            }),
        );
        act(() => {
            result.current.onTapReveal();
        });
        expect(result.current.revealed).toBe(false);
    });

    it('scatterPetals يكشف عند الوصول لعتبة التقدم', () => {
        const wrap = document.createElement('div');
        Object.defineProperty(wrap, 'getBoundingClientRect', {
            value: () => ({ left: 0, top: 0, width: 200, height: 200 }),
        });
        const leaf = document.createElement('span');
        leaf.dataset.left = '50';
        leaf.dataset.top = '50';

        const wrapRef = { current: wrap };
        const leafRefs = { current: [leaf] };

        const { result } = renderHook(() =>
            useProfileTextCanvasReveal({
                interaction: 'stardust',
                canInteract: true,
                wrapRef,
                leafRefs,
            }),
        );

        const event = {
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
            clientX: 100,
            clientY: 100,
            pointerId: 1,
            currentTarget: {
                setPointerCapture: vi.fn(),
                hasPointerCapture: () => true,
                releasePointerCapture: vi.fn(),
            },
        } as unknown as React.PointerEvent<HTMLDivElement>;

        const strokes = Math.ceil(PETAL_CLEAR_PROGRESS / 14);
        for (let i = 0; i < strokes; i++) {
            act(() => {
                result.current.onPetalPointerDown(event);
            });
        }

        expect(result.current.revealed).toBe(true);
    });
});
