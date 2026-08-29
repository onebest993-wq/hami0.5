import { describe, expect, it, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useVisualViewportFixedBox } from '@/app/hooks/useVisualViewportFixedBox';

describe('useVisualViewportFixedBox', () => {
    const originalVv = window.visualViewport;

    afterEach(() => {
        Object.defineProperty(window, 'visualViewport', {
            configurable: true,
            value: originalVv,
        });
    });

    it('يعيد فارغاً عند التعطيل', () => {
        const { result } = renderHook(() => useVisualViewportFixedBox(false));
        expect(result.current).toEqual({ style: {}, keyboardOpen: false });
    });

    it('يثبّت الصندوق على visualViewport ويكتشف الكيبورد', async () => {
        const listeners = new Map<string, Array<() => void>>();
        const vv = {
            offsetTop: 0,
            offsetLeft: 0,
            width: 390,
            height: 844,
            addEventListener: (type: string, cb: () => void) => {
                const list = listeners.get(type) ?? [];
                list.push(cb);
                listeners.set(type, list);
            },
            removeEventListener: (type: string, cb: () => void) => {
                const list = (listeners.get(type) ?? []).filter((fn) => fn !== cb);
                listeners.set(type, list);
            },
        };
        Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });

        const { result } = renderHook(() => useVisualViewportFixedBox(true));
        expect(result.current.style.height).toBe(844);
        expect(result.current.keyboardOpen).toBe(false);

        await act(async () => {
            vv.height = 520;
            listeners.get('resize')?.forEach((fn) => fn());
            await new Promise((r) => requestAnimationFrame(() => r(null)));
        });
        expect(result.current.style.height).toBe(520);
        expect(result.current.keyboardOpen).toBe(true);
    });
});
